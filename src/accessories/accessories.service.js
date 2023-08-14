'use strict';

const logger = require('../utils/logger');

class Accessory {
  constructor(api, accessory, handler) {
    this.api = api;
    this.accessory = accessory;
    this.handler = handler;

    this.purifierService = null;

    this.getService();
  }

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Services
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

  getService() {
    logger.info(`Initializing ${this.accessory.displayName}`);

    //Service.AirPurifier
    this.purifierService = this.accessory.getService(this.api.hap.Service.AirPurifier);

    if (!this.purifierService) {
      this.purifierService = this.accessory.addService(
        this.api.hap.Service.AirPurifier,
        this.accessory.displayName,
        'purifier'
      );
    }

    this.purifierService
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet(async (state) => await this.handler.setPurifierActive(state));

    this.purifierService
      .getCharacteristic(this.api.hap.Characteristic.CurrentAirPurifierState);

    this.purifierService
      .getCharacteristic(this.api.hap.Characteristic.TargetAirPurifierState)
      .onSet(async (state) => await this.handler.setPurifierTargetState(state));

    //Service.AirQuality
    this.airQualityService = this.accessory.getService(this.api.hap.Service.AirQualitySensor);

    if (!this.airQualityService) {
      this.airQualityService = this.accessory.addService(
        this.api.hap.Service.AirQualitySensor,
        'Air Quality',
        'Air Quality'
      );
    }

    if (!this.airQualityService.testCharacteristic(this.api.hap.Characteristic.PM2_5Density)) {
      this.airQualityService.addCharacteristic(this.api.hap.Characteristic.PM2_5Density);
    }

    this.handler.longPoll();
  }
}

module.exports = Accessory;
