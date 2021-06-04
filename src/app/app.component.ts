import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { split, find, toLower } from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from './common/constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public matchUrl = 'https://www.faceit.com/en/csgo/room/1-eb6d96eb-2403-4713-b730-cb91b5c54a7c/scoreboard';
  public faceitUsername = '';
  public submitted = false;
  public analysing = false;
  public result: any;
  public warning = '';
  public commonMatchesModel = [
    { nickname: 'IcedGreenTea' },
    { nickname: 'itdog' },
  ]

  constructor(private http: HttpClient) { }

  async analyse() {
    this.warning = '';
    this.submitted = true;
    this.analysing = true;
    try {
      const options: any = {
        headers: { Authorization: `Bearer ${Constants.AUTH_TOKEN}` },
      };
      const splitted = split(this.matchUrl, '/');
      const matchIdIdx = splitted.indexOf('room') + 1;
      const matchId = splitted[matchIdIdx];
      if (matchIdIdx === 0 || !matchId) {
        throw new Error('match_id not found.');
      }
      const response: any = await this.http.get(`${Constants.GET_MATCH_ENDPOINT}/${matchId}`, options).toPromise();
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
      await Promise.mapSeries(targetFaction.roster, ({ nickname, game_skill_level, player_id }) => {
        // get player stats here
        rows.push({ nickname, game_skill_level, player_id });
      });
      this.result = rows;
    } catch (ex) {
      this.warning = ex.message;
      this.result = null;
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
