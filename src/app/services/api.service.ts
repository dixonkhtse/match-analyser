import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isFunction } from 'lodash';
import { Constants } from '../common/constants';

@Injectable({
  providedIn: 'root'
})

export class ApiService {
  constructor(private http: HttpClient) {
  }

  public async request(params) {
    const { method, path, options = {} } = params;
    if (!isFunction(this.http[method])) {
      throw new Error('API service: invalid method');
    }
    return this.http[method](path, { ...options, headers: { Authorization: `Bearer ${Constants.AUTH_TOKEN}` } }).toPromise();
  }

  public async requestV1(params) {
    const { method, path, options = {} } = params;
    if (!isFunction(this.http[method])) {
      throw new Error('API service: invalid method');
    }
    return this.http[method](path, { ...options }).toPromise();
  }
}
