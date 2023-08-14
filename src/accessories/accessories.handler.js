'use strict';

const path = require('path');
const { exec, spawn } = require('child_process');

const logger = require('../utils/logger');

class Handler {
  constructor(api, accessory) {
    this.api = api;
    this.accessory = accessory;

    this.shutdown = false;
    this.airControl = null;
    this.obj = {};
    this.keyMaps = {};
    this.valueMaps = {};


    // Set Model specific Settings
    if (this.accessory.context.config.model == 'AC0850/11') {
      this.keyMaps = {
        pwr: 'D03-02',
        mode: 'D03-12',
        iaql: 'D03-32',
        pm25: 'D03-33',
      };
	this.valueMaps = {
        pwr: {
	  OFF: 0,
          ON: 1,
          0: 'OFF',
          1: 'ON',
        },
        mode: {
          Sleep: 0,
          Turbo: 1,
	  'Auto General': 2,
          0: 'Sleep',
          1: 'Turbo',
	  2: 'Auto General'
        },
      };
    }

    this.args = [
      'python3',
      `${path.resolve(__dirname, '../../')}/lib/pyaircontrol.py`,
      '-H',
      this.accessory.context.config.host,
      '-P',
      this.accessory.context.config.port,
      this.accessory.context.config.debug ? '-D' : '',
    ].filter((cmd) => cmd);
  }

  sendCMD(args) {
    logger.debug(`CMD: ${args.join(' ')}`, this.accessory.displayName);

    return new Promise((resolve, reject) => {
      exec(args.join(' '), (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }

        logger.debug(stderr, this.accessory.displayName);
        resolve();
      });
    });
  }

  handleResponse(json) {
    this.obj = json;

    Object.entries(this.keyMaps).forEach(([key, mappedKey]) => {
      this.obj[key] = this.valueMaps[key] ? this.valueMaps[key][this.obj[mappedKey]] : this.obj[mappedKey];
      delete this.obj[mappedKey];
    });

    logger.debug(this.obj, this.accessory.displayName);
  }

  handleCommand(key, value) {
    key = this.keyMaps[key] || key;
    value = this.valueMaps[key] ? this.valueMaps[key][value] : value;
    logger.debug(`${key}=${value}`, this.accessory.displayName);

    return `${key}=${value}`;
  }

  //Air Purifier
  async setPurifierActive(state) {
    try {
      const stateNumber = state ? 'ON' : 'OFF';

      const args = [...this.args];
      args.push('set', `${this.handleCommand('pwr', stateNumber)}`);

      logger.info(`Purifier Active: ${state}`, this.accessory.displayName);
      await this.sendCMD(args);
    } catch (err) {
      logger.warn('An error occured during changing purifier state!', this.accessory.displayName);
      logger.error(err, this.accessory.displayName);
    }
  }


  //Longpoll Process
  longPoll() {
    this.purifierService = this.accessory.getService(this.api.hap.Service.AirPurifier);

    this.airQualityService = this.accessory.getService('Air Quality');

    const args = [...this.args];
    args.push('status-observe', '-J');

    this.airControl = spawn(args.shift(), args);

    this.airControl.stdout.on('data', async (data) => {
      this.handleResponse(JSON.parse(data.toString()));

      //Air Purifier
      this.purifierService
        .updateCharacteristic(this.api.hap.Characteristic.Active, parseInt(this.obj.pwr) ? 1 : 0)

      if (this.airQualityService) {
        this.airQualityService
          .updateCharacteristic(this.api.hap.Characteristic.AirQuality, Math.ceil(this.obj.iaql / 3))
          .updateCharacteristic(this.api.hap.Characteristic.PM2_5Density, this.obj.pm25);
      }

    });

    this.airControl.stderr.on('data', (data) => {
      logger.debug(data.toString(), this.accessory.displayName);
    });

    this.airControl.stderr.on('exit', () => {
      logger.debug(
        `airControl process killed (${this.shutdown ? 'expected' : 'not expected'})`,
        this.accessory.displayName
      );

      clearTimeout(this.processTimeout);

      if (!this.shutdown) {
        logger.debug('Restarting polling process', this.accessory.displayName);
      }
    });

    this.processTimeout = setTimeout(() => {
      if (this.airControl) {
        this.airControl.kill();
        this.airControl = null;
      }

      this.longPoll();
    }, 1 * 60 * 1000);
  }

  kill(shutdown) {
    this.shutdown = shutdown || false;

    if (this.airControl) {
      logger.debug('Killing airControl process', this.accessory.displayName);
      this.airControl.kill();
    }
  }
}

module.exports = Handler;
