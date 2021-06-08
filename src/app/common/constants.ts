export class Constants {
  public static AUTH_TOKEN = '49f830fc-93cc-4dae-8006-01b1d7e0b8dd';
  public static GAME_ID_CSGO = 'csgo';
  public static GET_MATCH_ENDPOINT = 'https://open.faceit.com/data/v4/matches';
  public static GET_PLAYERS_ENDPOINT = 'https://open.faceit.com/data/v4/players';
  public static API_PREFIX = 'https://open.faceit.com/data/v4';
  public static REQUEST_OPTIONS: any = {
    headers: { Authorization: `Bearer ${Constants.AUTH_TOKEN}` },
  };
}
