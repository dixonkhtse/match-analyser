import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  get, set, pick,
  split, find, toLower,
  each, map, size,
  sortBy, reverse,
} from 'lodash';
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
  public rowsConfig = [
    {
      type: 'single',
      key: 'nickname',
      label: 'Player',
    },
    {
      key: 'game_skill_level',
      label: 'Level',
      class: 'level',
      type: 'image',
      srcPrefix: 'assets/icons/lv',
      srcPostfix: '.svg',
    },
  ];
  public columnsConfig = {
    'Win Rate %': {
      postfix: '%',
      classes: [
        { min: 0, max: 49, value: 'poor' },
        { min: 50, max: 59, value: 'average' },
        { min: 60, max: 100, value: 'good' },
      ]
    },
    'Average K/D Ratio': {
      classes: [
        { min: 0, max: 0.99, value: 'poor' },
        { min: 1, max: 1.2, value: 'average' },
        { min: 1.21, max: 99, value: 'good' },
      ]
    },
  };
  public statKeys = [
    'Matches',
    'Win Rate %',
    'Average K/D Ratio',
  ];
  public maps: any = [];

  constructor(private http: HttpClient) { }

  public findClass(value, statKey) {
    if (!get(this.columnsConfig, [statKey, 'classes'])) {
      return '';
    }
    const classConfig = find(get(this.columnsConfig, [statKey, 'classes']), ({ min, max }) => value >= min && value <= max);
    return get(classConfig, 'value', '');
  }

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
      let columns = [];
      await Promise.mapSeries(targetFaction.roster, async ({ nickname, game_skill_level, player_id }) => {
        const path = `${Constants.GET_PLAYERS_ENDPOINT}/${player_id}/stats/${Constants.GAME_ID_CSGO}`;
        const res: any = await this.http.get(path, Constants.REQUEST_OPTIONS).toPromise();
        if (!res) {
          return true;
        }
        const { lifetime, segments } = res;
        const playerData: any = {
          nickname,
          game_skill_level,
          player_id,
          avgKd: get(lifetime, 'Average K/D Ratio'),
        };
        each(segments, mapData => {
          if (mapData.label.substr(0, 3) !== 'de_') {
            return true;
          }
          if (!this.maps.includes(mapData.label)) {
            this.maps.push(mapData.label);
          }
          set(playerData, [mapData.label], pick(mapData.stats, this.statKeys));
          return true;
        });
        columns.push(playerData);
        return true;
      });
      columns = reverse(sortBy(columns, ['avgKd', 'game_skill_level']));
      this.rowsConfig.push(...map(this.maps, mapName => ({
        type: 'statKeys',
        key: mapName,
        label: mapName,
        rowSpan: size(this.statKeys),
      })));
      this.results = columns;
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
