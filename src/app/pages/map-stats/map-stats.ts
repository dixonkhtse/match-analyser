import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { get, set, pick, split, find, toLower, each } from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from '../../common/constants';

@Component({
  selector: 'app-map-stats',
  templateUrl: './map-stats.html',
  styleUrls: ['./map-stats.scss']
})
export class MapStatsComponent {
  public matchUrl = 'https://www.faceit.com/en/csgo/room/1-eb6d96eb-2403-4713-b730-cb91b5c54a7c/scoreboard';
  public faceitUsername = 'itdog';
  public submitted = false;
  public analysing = false;
  public results: any;
  public warning = '';
  public columnsConfig = [
    { key: 'nickname', label: 'Player' },
    {
      key: 'game_skill_level',
      label: 'Level',
      class: 'level',
      isImage: true,
      srcPrefix: 'assets/icons/lv',
      srcPostfix: '.svg',
    },
  ];
  public statKeys = [
    'Matches',
    'Win Rate %',
    'K/D Ratio',
  ];
  public maps: any = [];

  constructor(private http: HttpClient) { }

  async analyse() {
    this.warning = '';
    this.submitted = true;
    this.analysing = true;
    try {
      const splitted = split(this.matchUrl, '/');
      const matchIdIdx = splitted.indexOf('room') + 1;
      const matchId = splitted[matchIdIdx];
      if (matchIdIdx === 0 || !matchId) {
        throw new Error('match_id not found.');
      }
      const response: any = await this.http.get(`${Constants.GET_MATCH_ENDPOINT}/${matchId}`, Constants.REQUEST_OPTIONS).toPromise();
      if (!response) {
        throw new Error('Result not found.');
      }
      const { teams } = response;
      let targetFaction = find(teams, ({ roster }) =>
        find(roster, ({ nickname }) => toLower(nickname).includes(toLower(this.faceitUsername)))
      );
      if (!targetFaction) {
        ({ faction1: targetFaction } = teams);
      }
      const rows = [];
      await Promise.mapSeries(targetFaction.roster, async ({ nickname, game_skill_level, player_id }) => {
        // get player stats here
        const res: any = await this.http.get(`${Constants.GET_PLAYERS_ENDPOINT}/${player_id}/stats/${Constants.GAME_ID_CSGO}`, Constants.REQUEST_OPTIONS).toPromise();
        if (!res) {
          return true;
        }
        console.log(`player res ${nickname}:`, res);
        const { segments } = res;
        const playerData: any = {
          nickname,
          game_skill_level,
          player_id,
        };
        each(segments, mapData => {
          if (!this.maps.includes(mapData.label)) {
            this.maps.push(mapData.label);
          }
          set(playerData, [mapData.label], pick(mapData.stats, this.statKeys));
        });
        rows.push(playerData);
        return true;
      });
      console.log('rows', rows);
      console.log('this.maps', this.maps);
      this.results = rows;
    } catch (ex) {
      this.warning = ex.message;
      this.results = null;
    } finally {
      this.analysing = false;
    }
  }

  reset() {
    this.warning = '';
    this.submitted = false;
    this.matchUrl = '';
    this.faceitUsername = '';
  }
}
