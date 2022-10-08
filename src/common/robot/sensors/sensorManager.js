/*  This module is responsible for managing the sensors,
    sensors are imported and stored in this module,
    all sampling is done through this module.
*/

import EnvironmentBoundsSensor from './env/envBoundsSensor';
import PositionSensor from './pose/positionSensor';
import PrevPositionSensor from './pose/prevPositionSensor';
import OrientationSensor from './pose/orientationSensor';
import HeadingSensor from './pose/headingSensor';
import DirectionsSensor from './pose/directionsSensor';
import NearbyPucksSensor from './nearby/nearbyPucksSensor';
import NearbyObstaclesSensor from './nearby/nearbyObstaclesSensor';
import ClosestObstaclePointSensor from './voronoi/closestObstaclePointSensor';
import NeighborsSensor from './nearby/neighborsSensor';
import ObstaclesAwareVoronoiCellSensor from './voronoi/obstaclesAwareVoronoiCellSensor';
import BufferedVoronoiCellSensor from './voronoi/bufferedVoronoiCellSensor';
import ReachedGoalSensor from './state/reachedGoalSensor';
import ReachedWaypointSensor from './state/reachedWaypointSensor';
import PucksNearGrapperSensor from './clustering/pucksNearGrapperSensor';
import ClosestPuckToGrapperSensor from './clustering/closestPuckToGrapperSensor';
import WallSensor from './env/wallSensor';
import PuckGoalAreaSensor from './state/puckGoalAreaSensor';

const toposort = require('toposort');

export const sensorSamplingTypes = {
  onStart: 'onStart',
  onUpdate: 'onUpdate'
};

const availableSensorDefitions = [
  EnvironmentBoundsSensor,
  WallSensor,
  PuckGoalAreaSensor,
  PositionSensor,
  PrevPositionSensor,
  OrientationSensor,
  HeadingSensor,
  DirectionsSensor,
  NearbyPucksSensor,
  NearbyObstaclesSensor,
  ClosestObstaclePointSensor,
  NeighborsSensor,
  ObstaclesAwareVoronoiCellSensor,
  BufferedVoronoiCellSensor,
  ReachedGoalSensor,
  ReachedWaypointSensor,
  PucksNearGrapperSensor,
  ClosestPuckToGrapperSensor
];

// Sensors are stored in this object allowing other modules to easily reference them
// e.g. in config when defining the enabled sensors, or in other sensors to define a dependency
export const AvailableSensors = availableSensorDefitions.reduce((acc, sensorDef) => {
  acc[sensorDef.name] = sensorDef;
  return acc;
}, {});

const orderSensors = (sensorList) => {
  const edges = [];
  sensorList.forEach((sensor) => {
    if (sensor.dependencies && sensor.dependencies.length > 0) {
      sensor.dependencies.forEach((dependency) => {
        edges.push([dependency.name, sensor.name]);
      });
    }
  });
  const sorted = toposort(edges);
  const unsorted = sensorList
    .filter((sensor) => !sorted.includes(sensor.name))
    .map((sensor) => sensor.name);

  return [...unsorted, ...sorted].map((name) => sensorList.find((s) => s.name === name));
};

export default class SensorManager {
  constructor(scene, robot, enabledSensors) {
    this.scene = scene;
    this.robot = robot;

    this.activeSensors = orderSensors(
      enabledSensors.map(({ Sensor }) => new Sensor(robot, scene))
    );
    this.sensorsOnStart = this.activeSensors
      .filter((s) => s.type === sensorSamplingTypes.onStart);
    this.sensorsOnUpdate = this.activeSensors
      .filter((s) => s.type === sensorSamplingTypes.onUpdate);

    this.values = this.activeSensors.reduce((acc, sensor) => {
      acc[sensor.name] = sensor.read();
      return acc;
    }, {});
  }

  readAll() {
    return this.activeSensors.reduce((acc, sensor) => {
      acc[sensor.name] = sensor.read();
      return acc;
    }, {});
  }

  read(name) {
    const sensor = this.activeSensors.find((s) => s.name === name);
    return sensor.read();
  }

  sense(name) {
    const sensor = this.activeSensors.find((s) => s.name === name);
    return sensor.read();
  }

  sample(name, params) {
    const sensor = this.activeSensors.find((s) => s.name === name);
    if (sensor) {
      sensor.sample(params);
    }
    this.values = {
      ...this.values,
      [name]: sensor.read()
    };
  }

  sampleSensors(sensorsList) {
    sensorsList.forEach((sensor) => {
      this.sample(sensor.name);
    });
  }

  update() {
    this.sampleSensors(this.sensorsOnUpdate);
  }

  start() {
    this.sampleSensors(this.sensorsOnStart);
  }
}
