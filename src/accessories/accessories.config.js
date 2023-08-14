'use strict';

const { validIP } = require('../utils/utils');

const Config = (deviceConfig) => {
  return {
    active: deviceConfig.active || false,
    name: deviceConfig.name,
    manufacturer: deviceConfig.manufacturer || 'Philips',
    model: deviceConfig.model || 'AC0850/11',
    serialNumber: deviceConfig.serialNumber || '000000',
    host: validIP(deviceConfig.host),
    port: deviceConfig.port || 5683,
  };
};

module.exports = Config;
