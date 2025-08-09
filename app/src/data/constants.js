//export const BASE_URI = "https://demo15.angolaerp.co.ao";
export const constants = {
  BASE_URI: "https://demo15.angolaerp.co.ao"
};
// must match the "scheme" property of the "app.json" file
export const REDIRECT_URL_SCHEME = "factura.facil.metagest";

export const SECURE_AUTH_STATE_KEY = "AuthState";
//export const OAUTH_CLIENT_ID = "trh5tkpqag";
export const OAUTH_CLIENT_ID = (process.env.NODE_ENV != "development") ? "lggs8rf2n4":"trh5tkpqag";

//Factura facil 
//factura-facil-teste 6caq91r151
//FacturaFacil 53sqjjv7dl
