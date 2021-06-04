import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { split, find, toLower, keyBy, intersectionBy, map, filter } from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from './common/constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // Head to head
  public commonMatchesModel = [
    { nickname: 'IcedGreenTea' },
    { nickname: 'yymac' },
  ]
  public commonMatchesList: any;

  // Map stats
  public matchUrl = 'https://www.faceit.com/en/csgo/room/1-eb6d96eb-2403-4713-b730-cb91b5c54a7c/scoreboard';
  public faceitUsername = '';
  public submitted = false;
  public analysing = false;
  public result: any;
  public warning = '';

  constructor(private http: HttpClient) { }

  async findCommonMatches() {
    this.analysing = true;
    try {
      const playerIdList = [];
      let rows = [];

      await Promise.mapSeries(this.commonMatchesModel, async ({ nickname }, index) => {
        let row = {}
        let playerId;
        playerId = await this.getPlayerIdByNickname(nickname);

        playerIdList[index] = playerId;
        row['nickname'] = nickname;
        row['id'] = playerId;

        const matchHistory = await this.getPlayerMatchHistoryById(playerIdList[index]);
        row['matchHistory'] = matchHistory;

        rows.push(row);
      });

      let commonMatchesIdList = this.intersectMatchHistory(rows[0].matchHistory, rows[1].matchHistory);

      console.log(commonMatchesIdList);

      for (let row of rows) {
        row['commonMatches'] = filter(row.matchHistory, (match) => { return commonMatchesIdList.indexOf(match.matchId) > -1 });
      }

      console.log(rows);
    }
    catch (ex) {
      this.warning = ex.message;
    }
    finally {
      this.analysing = false;
    }
  }

  async getPlayerByNickname(nickname) {
    return this.http.get(`${Constants.GET_PLAYERS_ENDPOINT}?nickname=${nickname}`, Constants.REQUEST_OPTIONS).toPromise()
  }

  async getPlayerIdByNickname(nickname) {
    const player: any = await this.getPlayerByNickname(nickname);
    if (!player) {
      throw new Error('Player not found.');
    }
    return player['player_id'];
  }

  async getPlayerMatchHistoryById(playerId) {
    return this.http.get(`https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/csgo?page=0&size=2000`).toPromise();
    // return this.http.get(`${Constants.GET_PLAYERS_ENDPOINT}/${playerId}/history?game=csgo&from=1420041600&limit=2000`, Constants.REQUEST_OPTIONS).toPromise();
  }

  intersectMatchHistory(h1, h2) {
    return map(intersectionBy(h1, h2, 'matchId'), 'matchId');
  }

  // checkCommonMatches() {
  //   var playerOneNickname = $("#player1").val();
  //   var playerTwoNickname = $("#player2").val();
  //   var playerOneId, playerTwoId, playerOneStats, playerTwoStats, matchesPlayedTgt;

  //   var style = "font-weight: bold; background-color: yellow;"
  //   console.log(`%cMatches between ${playerOneNickname} and ${playerTwoNickname}`, style);

  //   //https://api.faceit.com/match/v2/match/1-df626bd0-1a7e-475d-8851-1621e20e4bd4

  //   $.when(getPlayerIdByNickname(playerOneNickname), getPlayerIdByNickname(playerTwoNickname)).done(
  //     function (p1, p2) {
  //       $.when(getPlayerMatchHistoryById(p1), getPlayerMatchHistoryById(p2)).done(
  //         function (p1History, p2History) {
  //           var p1HistoryObj = arrayToObject(p1History[0], 'matchId');
  //           var p2HistoryObj = arrayToObject(p2History[0], 'matchId');

  //           var commonMatches = findCommonMatches(p1History[0], p2History[0]);
  //           var commonMatchesTableData = [];
  //           _.each(commonMatches, function (matchId) {
  //             console.log("matchId", matchId);
  //             commonMatchesTableData.push(p2HistoryObj[matchId]);
  //           })
  //           console.log(commonMatchesTableData);
  //           $('#common-matches-table').DataTable(
  //             {
  //               data: commonMatchesTableData,
  //               "columns": [
  //                 { title: "Match ID", data: "matchId" },
  //                 { title: "Map", data: "i1" }
  //               ]
  //             }
  //           );
  //         }
  //       )
  //     }
  //   );
  // }


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
