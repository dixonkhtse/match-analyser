import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sort } from '@angular/material/sort';
import {
  get, set, split, mean,
  find, toLower, each, map as _map,
  sortBy, reverse, trim,
} from 'lodash';
import { Promise } from 'bluebird';
import { Constants } from '../../common/constants';
@Component({
  selector: 'app-match-stats',
  templateUrl: './match-stats.html',
  styleUrls: ['./match-stats.scss']
})
export class MatchStatsComponent {
  public matchUrl = '';
  public faceitUsername = '';
  public submitted = false;
  public analysing = false;
  public results: any;
  public warning = '';
  public targetFaction: any;
  public progressNow = 0;
  public progressMax = 10;
  public rawData: any = [];
  public rawAvgData: any = [];
  public sortedData: any;
  public sortedAvgData: any;
  public players: any = [];
  public sortedPlayers: any = [];
  public pSortModel: any = {};
  public pSortFields: any = [
    { key: 'elo', label: 'Elo' },
    { key: 'avgKd', label: 'Average K/D Ratio' },
  ];
  public statKeyConfigs = [{
    key: 'Matches',
    digitsInfo: '0.0-0',
  }, {
    key: 'Win Rate %',
    label: 'Win Rate',
    postfix: '%',
    classes: [
      { name: 'poor', range: [0, 49] },
      { name: 'average', range: [50, 59] },
      { name: 'good', range: [60, 100] },
    ],
    digitsInfo: '0.0-0',
  }, {
    key: 'Average K/D Ratio',
    label: 'Avg. K/D',
    classes: [
      { name: 'poor', range: [0, 0.99] },
      { name: 'average', range: [1, 1.19] },
      { name: 'good', range: [1.20, 99] },
    ],
    digitsInfo: '1.2-2',
  }];

  constructor(private http: HttpClient) {
    this.rawData = _map(Constants.ACTIVE_DUTY_MAPS, map => ({ map }));
  }

  compare(a, b, isAsc) {
    if (a === undefined || b === undefined) {
      return 1;
    }
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  sortData(sort: Sort, sortedDataKey, rawDataKey) {
    const data = this[rawDataKey].slice();
    if (!sort.active || sort.direction === '') {
      this[sortedDataKey] = data;
      return;
    }
    this[sortedDataKey] = data.sort((a, b) => this.compare(get(a, sort.active), get(b, sort.active), sort.direction === 'asc'));
  }

  sortPlayers() {
    let sorted = this.players.slice();
    if (!this.pSortModel.sortKey) {
      return;
    }
    sorted = sortBy(this.players, this.pSortModel.sortKey);
    if (!this.pSortModel._isAsc) {
      sorted = reverse(sorted);
    }
    this.sortedPlayers = sorted;
  }

  public findClass(value, statKeyConf) {
    const classes = get(statKeyConf, 'classes');
    if (!classes) {
      return '';
    }
    const cl = find(classes, ({ range: [min, max] }) => value >= min && value <= max);
    return get(cl, 'name', '');
  }

  async analyse() {
    this.warning = '';
    this.submitted = true;
    this.analysing = true;
    this.targetFaction = null;
    this.players = [];
    this.rawData = _map(Constants.ACTIVE_DUTY_MAPS, map => ({ map }));
    this.sortedData = null;
    this.sortedAvgData = null;
    this.sortedPlayers = [];
    this.pSortModel = {};
    this.progressNow = 0;
    try {
      const splitted = split(this.matchUrl, '/');
      const matchIdIdx = splitted.indexOf('room') + 1;
      const matchId = splitted[matchIdIdx];
      if (matchIdIdx === 0 || !matchId) {
        throw new Error('match_id not found.');
      }
      const response: any = await this.http.get(`${Constants.GET_MATCH_ENDPOINT}/${matchId}`, Constants.REQUEST_OPTIONS).toPromise();
      this.progressNow += 1;
      if (!response) {
        throw new Error('Result not found.');
      }
      const { teams } = response;
      this.targetFaction = find(teams, ({ roster }) =>
        find(roster, ({ nickname }) => toLower(nickname).includes(toLower(trim(this.faceitUsername))))
      );
      if (!this.targetFaction) {
        ({ faction1: this.targetFaction } = teams);
      }
      await Promise.mapSeries(this.targetFaction.roster, async ({ nickname, player_id }) => {
        const pStatsPath = `${Constants.GET_PLAYERS_ENDPOINT}/${player_id}/stats/${Constants.GAME_ID_CSGO}`;
        const playerStats: any = await this.http.get(pStatsPath, Constants.REQUEST_OPTIONS).toPromise();
        this.progressNow += 1;
        if (!playerStats) {
          return true;
        }
        const pDetailsPath = `${Constants.GET_PLAYERS_ENDPOINT}/${player_id}`;
        const playerDetails: any = await this.http.get(pDetailsPath, Constants.REQUEST_OPTIONS).toPromise();
        if (!playerDetails) {
          this.progressNow += 1;
          return true;
        }
        const { lifetime, segments } = playerStats;
        const playerData: any = {
          player_id,
          nickname,
          skill_level: get(playerDetails, 'games.csgo.skill_level'),
          elo: get(playerDetails, 'games.csgo.faceit_elo'),
          avgKd: get(lifetime, 'Average K/D Ratio'),
        };
        each(segments, mapData => {
          const { label: mapName } = mapData;
          if (!Constants.ACTIVE_DUTY_MAPS.includes(mapName)) {
            return true;
          }
          const mapDataRow = find(this.rawData, ({ map }) => map === mapName);
          if (!mapDataRow) {
            return true;
          }
          each(this.statKeyConfigs, ({ key }) => {
            const dataKey = `${player_id}_${key}`;
            set(mapDataRow, dataKey, +get(mapData.stats, key));
          });
          return true;
        });
        this.players.push(playerData);
        this.progressNow += 1;
        return true;
      });
      this.rawAvgData = _map(this.rawData, row => {
        const obj = { map: row.map };
        const values: any = {};
        each(row, (value, key) => {
          const statKeyConf = find(this.statKeyConfigs, (item) => key.includes(item.key));
          if (!statKeyConf) {
            return true;
          }
          const { key: statKey } = statKeyConf;
          if (!values[statKey]) {
            values[statKey] = [];
          }
          values[statKey].push(value);
          return true;
        });
        each(values, (arr, key) => {
          set(obj, key, mean(arr));
        });
        return obj;
      });
      this.sortedPlayers = this.players.slice();
      this.sortedData = this.rawData.slice();
      this.sortedAvgData = this.rawAvgData.slice();
    } catch (ex) {
      this.warning = ex.message;
      this.sortedPlayers = [];
      this.sortedData = null;
      this.sortedAvgData = null;
    } finally {
      this.analysing = false;
      this.progressNow = 0;
    }
  }

  clear() {
    this.warning = '';
    this.submitted = false;
    this.matchUrl = '';
    this.faceitUsername = '';
  }
}
