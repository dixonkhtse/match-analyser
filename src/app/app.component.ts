import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { split, find } from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from './common/constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public matchUrl = '';
  public faceitUsername = '';
  public submitted = false;
  public analysing = false;
  public result: any;
  public warning = '';

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
      let targetFaction = find(teams, ({ roster }) => find(roster, ({ nickname }) => nickname === this.faceitUsername));
      if (!targetFaction) {
        ({ faction1: targetFaction } = teams);
      }
      const rows = [];
      await Promise.mapSeries(targetFaction.roster, ({ nickname, game_skill_level, player_id }) => {
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
