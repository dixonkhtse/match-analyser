import { Component } from '@angular/core';
import { keyBy, intersectionBy, map, filter, set } from 'lodash';
import { Promise } from 'bluebird';
import { ApiService } from '../../services/api.service';
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

  constructor(private apiSvc: ApiService) { }

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
    return this.apiSvc.request({ method: 'get', path: `${Constants.GET_PLAYERS_ENDPOINT}?nickname=${nickname}` });
  }

  async getPlayerIdByNickname(nickname) {
    const player: any = await this.getPlayerByNickname(nickname);
    if (!player) {
      throw new Error('Player not found.');
    }
    return player.player_id;
  }

  async getPlayerMatchHistoryById(playerId) {
    return this.apiSvc.requestV1({ method: 'get', path: `https://api.faceit.com/stats/v1/stats/time/users/${playerId}/games/csgo?page=0&size=2000` });
  }

  async getMatchSummary(matchId) {
    return this.apiSvc.request({ method: 'get', path: `${Constants.GET_MATCH_ENDPOINT}/${matchId}` });
  }

  async getMatchStats(matchId) {
    return this.apiSvc.request({ method: 'get', path: `${Constants.GET_MATCH_ENDPOINT}/${matchId}/stats` });
  }

  intersectMatchHistory(h1, h2) {
    return map(intersectionBy(h1, h2, 'matchId'), 'matchId');
  }

  clear() {
    this.warning = '';
    this.submitted = false;
    this.commonMatchesModel = map(this.commonMatchesModel, () => ({ nickname: '' }));
  }
}
