/**
 * v1
 *
 * @url https://github.com/ptah4i/Homebridge-PhilipsAirPlatform
 * @author ptah4i
 *
 *
 *
 **/

module.exports = (homebridge) => {
  const PhilipsAirPlatform = require('./src/platform')(homebridge);
  homebridge.registerPlatform('homebridge-philipsair-platform', 'PhilipsAirPlatform', PhilipsAirPlatform, true);
};
