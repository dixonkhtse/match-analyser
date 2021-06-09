import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sort } from '@angular/material/sort';
import {
  get, set, split, mean,
  find, findKey, toLower, each,
  map as _map, sortBy, reverse,
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
  public rawData: any = [];
  public rawAvgData: any = [];
  public sortedData: any;
  public sortedAvgData: any;
  public players: any = [];
  public sortedPlayers: any = [];
  public pSortModel: any = {};
  public pSortFields: any = [
    { key: 'game_skill_level', label: 'Level' },
    { key: 'avgKd', label: 'Average K/D Ratio' },
  ];
  public statKeyConfigs = [{
    key: 'Matches',
    digitsInfo: '0.0-0',
  }, {
    key: 'Win Rate %',
    label: 'Win Rate',
    postfix: '%',
    classes: {
      poor: [0, 49],
      average: [50, 59],
      good: [60, 100],
    },
    digitsInfo: '0.0-0',
  }, {
    key: 'Average K/D Ratio',
    label: 'Avg. K/D',
    classes: {
      poor: [0, 0.99],
      average: [1, 1.2],
      good: [1.21, 99],
    },
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
    return findKey(classes, ([min, max]) => value >= min && value <= max) || '';
  }

  async analyse() {
    this.warning = '';
    this.submitted = true;
    this.analysing = true;
    this.players = [];
    this.rawData = _map(Constants.ACTIVE_DUTY_MAPS, map => ({ map }));
    this.sortedData = null;
    this.sortedAvgData = null;
    this.sortedPlayers = [];
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
      this.sortedData = null;
      this.sortedAvgData = null;
      this.sortedPlayers = [];
    } finally {
      this.analysing = false;
    }
  }

  clear() {
    this.warning = '';
    this.submitted = false;
    this.matchUrl = '';
    this.faceitUsername = '';
  }
}
