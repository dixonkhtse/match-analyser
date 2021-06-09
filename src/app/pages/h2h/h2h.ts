import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { keyBy, intersectionBy, map, filter, set } from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from '../../common/constants';

@Component({
  selector: 'app-h2h',
  templateUrl: './h2h.html',
  styleUrls: ['./h2h.scss']
})
export class HeadToHeadComponent {
  public commonMatchesModel = [
    { nickname: 'IcedGreenTea' },
    { nickname: 'yymac' },
  ];
  public commonMatchesList: any;
  public submitted = false;
  public analysing = false;
  public result: any;
  public warning = '';

  constructor(private http: HttpClient) { }

  async findCommonMatches() {
    this.analysing = true;
    try {
      const playerIdList = [];
      const playerList = [];
      const matchList = [];

      await Promise.mapSeries(this.commonMatchesModel, async ({ nickname }, index) => {
        const player: any = {};
        let playerId;

        playerId = await this.getPlayerIdByNickname(nickname);

        playerIdList[index] = playerId;

        const matchHistory = await this.getPlayerMatchHistoryById(playerIdList[index]);
        set(player, 'nickname', nickname);
        set(player, 'id', playerId);
        set(player, 'matchHistory', matchHistory);

        playerList.push(player);
      });

      const commonMatchesIdList = this.intersectMatchHistory(playerList[0].matchHistory, playerList[1].matchHistory);

      for (const player of playerList) {
        const commonMatches = filter(player.matchHistory, (match) => commonMatchesIdList.indexOf(match.matchId) > -1);
        set(player, 'commonMatches', commonMatches);
      }

      await Promise.mapSeries(commonMatchesIdList, async (matchId) => {
        const matchStats: any = await this.getMatchStats(matchId);
        for (const round of matchStats.rounds) {
          set(round, 'teams', keyBy(round.teams, 'team_id'));
          matchList.push(round);
        }
      });

      this.commonMatchesList = matchList;

      console.log(this.commonMatchesList);
    }
    catch (ex) {
      this.warning = ex.message;
    }
    finally {
      this.analysing = false;
    }
  }

  async getPlayerByNickname(nickname) {
    return this.http.get(`${Constants.GET_PLAYERS_ENDPOINT}?nickname=${nickname}`, Constants.REQUEST_OPTIONS).toPromise();
  }

  async getPlayerIdByNickname(nickname) {
    const player: any = await this.getPlayerByNickname(nickname);
    if (!player) {
      throw new Error('Player not found.');
    }
    return player.player_id;
  }

  async getPlayerMatchHistoryById(playerId) {
    return this.http.get(`https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/csgo?page=0&size=2000`).toPromise();
  }

  async getMatchSummary(matchId) {
    return this.http.get(`${Constants.GET_MATCH_ENDPOINT}/${matchId}`, Constants.REQUEST_OPTIONS).toPromise();
  }

  async getMatchStats(matchId) {
    return this.http.get(`${Constants.GET_MATCH_ENDPOINT}/${matchId}/stats`, Constants.REQUEST_OPTIONS).toPromise();
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

  clear() {
    this.warning = '';
    this.submitted = false;
    this.commonMatchesModel = map(this.commonMatchesModel, () => ({ nickname: '' }));
  }
}
