/**
 * 模拟 ESP32-P4 发送传感器数据到 MQTT Broker
 *
 * 使用方法:
 *   1. npm install mqtt
 *   2. node test-mqtt.js
 *
 * 然后在浏览器打开 dashboard/index.html，连接同一个 Broker 即可看到数据。
 */

const mqtt = require('mqtt');

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const DEVICE_ID = 'device01';
const INTERVAL_MS = 2000; // 每 2 秒发一次

const client = mqtt.connect(BROKER_URL, {
  clientId: 'esp32_sim_' + Math.random().toString(36).substr(2, 6),
  clean: true
});

client.on('connect', () => {
  console.log('[OK] 已连接 Broker:', BROKER_URL);
  console.log('[OK] 设备 ID:', DEVICE_ID);
  console.log('[OK] 每', INTERVAL_MS, 'ms 发送一次数据');
  console.log('--- 打开 dashboard/index.html 连接同一个 Broker 查看数据 ---\n');

  setInterval(sendAll, INTERVAL_MS);
});

client.on('error', (err) => {
  console.error('[ERR] 连接失败:', err.message);
});

// 模拟状态
let lat = 30.572, lng = 104.066;
let shakeTimer = 0;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pub(topic, data) {
  client.publish(DEVICE_ID + '/' + topic, JSON.stringify(data), { qos: 0 });
}

function sendAll() {
  // 心率 (模拟 60-100, 偶尔异常)
  const hr = Math.round(rand(62, 88) + (Math.random() < 0.05 ? rand(20, 40) : 0));
  const spo2 = Math.round(rand(95, 99) + (Math.random() < 0.03 ? -5 : 0));
  pub('sensor/hr', {
    heart_rate: hr,
    spO2: spo2,
    heart_rate_valid: true,
    spO2_valid: true,
    finger_detected: true,
    red_dc: Math.round(rand(80000, 120000)),
    ir_dc: Math.round(rand(90000, 130000))
  });

  // 温湿度
  pub('sensor/env', {
    temperature: rand(23, 28),
    humidity: rand(45, 65)
  });

  // 烟雾 (偶尔飙升)
  const gas = Math.round(rand(80, 200) + (Math.random() < 0.03 ? rand(400, 600) : 0));
  pub('sensor/gas', { raw_smoke: gas });

  // GPS (模拟缓慢移动)
  lat += rand(-0.00005, 0.00005);
  lng += rand(-0.00005, 0.00005);
  pub('sensor/gps', {
    latitude: lat,
    longitude: lng,
    valid: true,
    north_south: 'N',
    east_west: 'E',
    utc_time: new Date().toISOString().substr(11, 8).replace(/:/g, '')
  });

  // MPU6050 (偶尔模拟摔倒)
  shakeTimer++;
  let shake = false, motion = 0;
  if (shakeTimer % 30 === 0) { // 每 60 秒模拟一次剧烈晃动
    shake = true; motion = 2;
    console.log('[ALERT] 模拟摔倒事件!');
  } else {
    motion = Math.random() < 0.6 ? 0 : (Math.random() < 0.7 ? 1 : 2);
    shake = motion >= 2 && Math.random() < 0.3;
  }
  pub('sensor/mpu6050', {
    accel_x_g: rand(-0.1, 0.1),
    accel_y_g: rand(-0.1, 0.1),
    accel_z_g: rand(0.95, 1.05),
    gyro_x_dps: rand(-2, 2),
    gyro_y_dps: rand(-2, 2),
    gyro_z_dps: rand(-1, 1),
    shake_detected: shake,
    motion_status: motion
  });

  // 人体感应
  pub('sensor/ld2410b', {
    presence_detected: Math.random() < 0.85
  });

  process.stdout.write('.');
}
