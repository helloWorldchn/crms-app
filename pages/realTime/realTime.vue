<template>
  <view class="container">
    <!-- 设备选择卡片 -->
    <view class="card device-card">
      <view class="card-header">
        <text>设备选择</text>
      </view>
      <view class="card-body">
        <picker
          mode="selector"
          :range="deviceOptions"
          :range-key="'label'"
          :value="selectedIndex"
          @change="onDevicePickerChange"
          :disabled="deviceLoading"
        >
          <view class="picker-display">
            <text>{{ selectedDeviceKey ? (selectedDeviceLabel || '请选择设备') : '请选择设备' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <!-- 搜索框（可选，用于远程搜索） -->
<!--        <view class="search-box">
          <input
            type="text"
            v-model="searchKeyword"
            placeholder="输入设备ID或名称搜索"
            @confirm="searchDevices"
            @input="onSearchInput"
          />
          <button @click="searchDevices" size="mini" type="primary">搜索</button>
        </view> -->
      </view>
    </view>

    <!-- 空设备提示 -->
    <view v-if="deviceOptions.length === 0" class="card empty-card">
      <view class="card-body empty-device-wrapper">
        <text class="empty-icon">⚠️</text>
        <text class="empty-text">暂无可用设备，请先添加设备</text>
        <button class="btn btn-primary refresh-list-btn" @click="fetchDeviceList">刷新列表</button>
      </view>
    </view>

    <!-- 实时数据卡片（仅当有设备时显示） -->
    <view v-else class="card">
      <view class="card-header">
        <text>实时环境监测</text>
        <text class="refresh-btn" @click="fetchData" :class="{loading: loading}">⟳ 刷新</text>
      </view>
      <view class="card-body">
        <view v-if="!selectedDeviceKey" class="loading-mask">
          <text>请先选择设备</text>
        </view>
        <view v-else-if="connecting && !environmentData" class="loading-mask">
          <text>连接中...</text>
        </view>
        <view v-else-if="error" class="error-mask">
          <text>{{ error }}</text>
          <text class="refresh-btn" @click="reconnectWebSocket">重连</text>
        </view>
        <view v-else-if="!environmentData" class="loading-mask">
          <text>等待数据推送...</text>
        </view>
        <view v-else>

          <!-- 第一行：温度、湿度 -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">温度：</text>
              <text class="value">{{ environmentData.temperature }} °C</text>
            </view>
            <view class="info-item">
              <text class="label">湿度：</text>
              <text class="value">{{ environmentData.humidity }} %</text>
            </view>
          </view>
          <!-- 第二行：气体浓度 + 状态 -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">气体浓度：</text>
              <text class="value">{{ environmentData.gasPpm }} ppm</text>
            </view>
            <view class="info-item">
              <text class="label">气体状态：</text>
              <text :class="['tag', environmentData.gasStatus === 1 ? 'tag-danger' : 'tag-success']">
                {{ environmentData.gasStatus === 1 ? '异常' : '正常' }}
              </text>
            </view>
          </view>
          <!-- 第三行：光照状态 + 百分比 -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">光照状态：</text>
              <text :class="['tag', environmentData.lightStatus === 1 ? 'tag-warning' : 'tag-info']">
                {{ environmentData.lightStatus === 1 ? '开启' : '关闭' }}
              </text>
            </view>
            <view class="info-item">
              <text class="label">光照百分比：</text>
              <text class="value">{{ environmentData.lightPercentage }} %</text>
            </view>
          </view>
          <!-- 第四行：火焰状态 + 百分比 -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">火焰状态：</text>
              <text :class="['tag', environmentData.flameStatus === 1 ? 'tag-danger' : 'tag-success']">
                {{ environmentData.flameStatus === 1 ? '检测到火焰' : '无火焰' }}
              </text>
            </view>
            <view class="info-item">
              <text class="label">火焰百分比：</text>
              <text class="value">{{ environmentData.flamePercentage }} %</text>
            </view>
          </view>
          <!-- 第五行：告警状态 -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">告警状态：</text>
              <text :class="['tag', environmentData.alarmStatus === 1 ? 'tag-danger' : 'tag-success']">
                {{ environmentData.alarmStatus === 1 ? '告警中' : '正常' }}
              </text>
            </view>
          </view>
          <!-- 第六行：散热器、LED -->
          <view class="data-row">
            <view class="info-item">
              <text class="label">散热器：</text>
              <text :class="['tag', environmentData.fanStatus === 1 ? 'tag-primary' : 'tag-info']">
                {{ environmentData.fanStatus === 1 ? '开启' : '关闭' }}
              </text>
            </view>
            <view class="info-item">
              <text class="label">LED：</text>
              <text :class="['tag', environmentData.ledStatus === 1 ? 'tag-warning' : 'tag-info']">
                {{ environmentData.ledStatus === 1 ? '开启' : '关闭' }}
              </text>
            </view>
          </view>
          <!-- 第七行：测量时间 -->
          <view class="data-row">
            <view class="info-item full-width">
              <text class="label">最新测量时间：</text>
              <text class="value">{{ environmentData.gmtMeasurement }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 设备反控卡片（仅当有设备时显示） -->
    <view v-if="deviceOptions.length > 0" class="card">
      <view class="card-header">
        <text>设备反控</text>
      </view>
      <view class="card-body">
        <!-- 散热器控制 -->
        <view class="control-row">
          <view class="control-icon">
            <text :class="['fan-icon', environmentData && environmentData.fanStatus === 1 ? 'fan-animate' : '']">🌀</text>
          </view>
          <view class="control-info">
            <view class="control-label">散热器</view>
            <view class="control-status">当前状态: {{ environmentData && environmentData.fanStatus === 1 ? '开启' : '关闭' }}</view>
            <view class="button-group">
              <button 
                class="btn btn-primary" 
                :disabled="fanLoading || (pendingCommand && pendingCommand.deviceType === 'fan') || (environmentData && environmentData.fanStatus === 1)"
                @click="controlRadiator('on')"
              >打开</button>
              <button 
                class="btn btn-danger" 
                :disabled="fanLoading || (pendingCommand && pendingCommand.deviceType === 'fan') || (environmentData && environmentData.fanStatus === 0)"
                @click="controlRadiator('off')"
              >关闭</button>
            </view>
          </view>
        </view>
        <!-- LED 控制 -->
        <view class="control-row">
          <view class="control-icon">
            <text :class="['led-icon', environmentData && environmentData.ledStatus === 1 ? 'led-on-glow' : '']">💡</text>
          </view>
          <view class="control-info">
            <view class="control-label">LED灯</view>
            <view class="control-status">当前状态: {{ environmentData && environmentData.ledStatus === 1 ? '开启' : '关闭' }}</view>
            <view class="button-group">
              <button 
                class="btn btn-primary" 
                :disabled="ledLoading || (pendingCommand && pendingCommand.deviceType === 'led') || (environmentData && environmentData.ledStatus === 1)"
                @click="controlLed('on')"
              >打开</button>
              <button 
                class="btn btn-danger" 
                :disabled="ledLoading || (pendingCommand && pendingCommand.deviceType === 'led') || (environmentData && environmentData.ledStatus === 0)"
                @click="controlLed('off')"
              >关闭</button>
            </view>
          </view>
        </view>
        <!-- 等待指令提示 -->
        <view v-if="pendingCommand" class="pending-tip">
          <text>⏳ 等待设备响应 {{ pendingCommand.deviceType === 'fan' ? '散热器' : 'LED' }} {{ pendingCommand.action === 'on' ? '开启' : '关闭' }} 指令...</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js';

// WebSocket 基础地址（需要支持动态订阅主题）
const WS_BASE_URL = 'ws://192.168.1.21:8080/ws/environment/websocket';

export default {
  data() {
    return {
      // 设备相关
      deviceOptions: [],        // [{ value: 'deviceKey', label: 'deviceName - deviceKey' }]
      selectedDeviceKey: null,  // 当前选中的设备Key
      selectedIndex: -1,        // picker 选中索引
      selectedDeviceLabel: '',  // 当前显示的标签
      deviceLoading: false,     // 设备列表加载中
      searchKeyword: '',        // 搜索关键词
      searchTimer: null,        // 搜索防抖定时器

      environmentData: null,
      loading: false,
      error: null,

      // WebSocket 相关
      socketTask: null,
      connecting: false,
      reconnectTimer: null,
      reconnectAttempts: 0,
      stompFrameBuffer: '',

      // 反控等待确认
      pendingCommand: null,
      commandTimeout: null,
      fanLoading: false,
      ledLoading: false,
      pollingTimer: null,

      // 数据超时降级
      dataTimeoutTimer: null,
      dataTimeoutDuration: 10000, // 10秒无数据则降级
      fallbackLock: false         // 防止重复降级
    };
  },
  onShow() {
    // 页面显示：加载设备列表
    this.fetchDeviceList();
  },
  onHide() {
    this.disconnectWebSocket();
    this.stopPolling();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.commandTimeout) clearTimeout(this.commandTimeout);
    this.stopDataTimeoutTimer();
  },
  onUnload() {
    this.disconnectWebSocket();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.commandTimeout) clearTimeout(this.commandTimeout);
    this.stopDataTimeoutTimer();
  },
  methods: {
    // ========== 设备列表相关 ==========
    async fetchDeviceList(keyword = '') {
      this.deviceLoading = true;
      try {
        const res = await request({
          url: '/service/device/getDeviceSelect',
          method: 'GET',
          data: keyword ? { keyword } : {}
        });
        if (res.code === 20000) {
          this.deviceOptions = (res.data || []).map(item => ({
            value: item.deviceKey,
            label: `${item.deviceName || '未命名'} (${item.deviceKey})`
          }));
          // 初始化设备选择（记忆/降级）
          this.initializeDeviceSelection();
        } else {
          uni.showToast({ title: res.msg || '获取设备列表失败', icon: 'none' });
        }
      } catch (err) {
        console.error('获取设备列表失败', err);
        uni.showToast({ title: '网络异常，获取设备列表失败', icon: 'none' });
      } finally {
        this.deviceLoading = false;
      }
    },

    // 初始化设备选择：根据记忆和降级策略设置选中设备
    initializeDeviceSelection() {
      if (this.deviceOptions.length === 0) {
        // 无设备时清空选中
        this.selectedDeviceKey = null;
        this.selectedIndex = -1;
        this.selectedDeviceLabel = '';
        this.environmentData = null;
        this.disconnectWebSocket();
        return;
      }

      const lastDevice = uni.getStorageSync('lastSelectedDevice');
      let targetDevice = null;
      let needFallbackTip = false;

      // 检查记忆设备是否存在
      if (lastDevice && this.deviceOptions.some(d => d.value === lastDevice)) {
        targetDevice = lastDevice;
      } else {
        // 记忆设备不存在，选择最活跃设备（列表第一个）
        targetDevice = this.deviceOptions[0].value;
        if (lastDevice) {
          needFallbackTip = true;
        }
      }

      // 如果当前选中的设备与目标不同，则切换
      if (this.selectedDeviceKey !== targetDevice) {
        this.selectedDeviceKey = targetDevice;
        this.selectedIndex = this.deviceOptions.findIndex(d => d.value === targetDevice);
        this.selectedDeviceLabel = this.deviceOptions[this.selectedIndex]?.label || '';
        this.onDeviceChange(this.selectedDeviceKey);
        if (needFallbackTip) {
          uni.showToast({ title: '您上次选择的设备已不可用，已为您切换到最新设备', icon: 'none', duration: 2000 });
        }
      } else if (this.selectedDeviceKey && !this.environmentData) {
        // 已有选中但无数据，触发数据加载
        this.onDeviceChange(this.selectedDeviceKey);
      }
    },

    // 远程搜索（防抖）
    searchDevices() {
      this.fetchDeviceList(this.searchKeyword);
    },
    onSearchInput(e) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.searchDevices();
      }, 300);
    },

    // picker 选择变化
    onDevicePickerChange(e) {
      const idx = e.detail.value;
      if (idx >= 0 && idx < this.deviceOptions.length) {
        const selected = this.deviceOptions[idx];
        this.selectedDeviceKey = selected.value;
        this.selectedIndex = idx;
        this.selectedDeviceLabel = selected.label;
        this.onDeviceChange(this.selectedDeviceKey);
      } else {
        // 清空选择
        this.selectedDeviceKey = null;
        this.selectedIndex = -1;
        this.selectedDeviceLabel = '';
        this.onDeviceChange(null);
      }
    },

    // 切换设备时的核心逻辑
    onDeviceChange(deviceKey) {
      // 清空降级锁
      this.fallbackLock = false;
      if (!deviceKey) {
        // 清空所有数据，断开连接
        this.environmentData = null;
        this.error = null;
        this.disconnectWebSocket();
        this.stopPolling();
        this.stopDataTimeoutTimer();
        uni.removeStorageSync('lastSelectedDevice');
        return;
      }
      // 保存用户选择
      uni.setStorageSync('lastSelectedDevice', deviceKey);

      // 重置状态
      this.environmentData = null;
      this.error = null;

      // 断开旧连接
      this.disconnectWebSocket();
      // 停止旧的数据超时定时器
      this.stopDataTimeoutTimer();
      // 启动新的数据超时检测
      this.startDataTimeoutTimer();

      // 获取新设备数据（HTTP）
      this.fetchData();

      // 建立新 WebSocket 连接（订阅该设备主题）
      this.connectWebSocket();
    },

    // ========== 数据获取 ==========
    async fetchData() {
      if (!this.selectedDeviceKey) return;
      this.loading = true;
      this.error = null;
      try {
        const res = await request({
          url: '/service/environment/getLastEnvironment',
          method: 'GET',
          data: { deviceKey: this.selectedDeviceKey }
        });
        if (res && res.data) {
          this.environmentData = res.data;
          // 收到数据，重置超时计时器
          this.resetDataTimeoutTimer();
        } else {
          throw new Error('数据格式错误');
        }
      } catch (err) {
        console.error('获取实时数据失败', err);
        // 如果错误提示设备不存在，触发降级
        if (err.msg && (err.msg.includes('不存在') || err.msg.includes('已删除'))) {
          this.handleDeviceInvalid();
        } else {
          this.error = err.msg || '获取数据失败，请检查网络';
        }
      } finally {
        this.loading = false;
      }
    },

    // 处理设备无效的情况（被删除或不存在）
    handleDeviceInvalid() {
      if (this.fallbackLock) return;
      this.fallbackLock = true;
      uni.showToast({ title: '当前设备可能已被删除，正在为您切换到可用设备', icon: 'none', duration: 2000 });
      // 刷新设备列表后重新选择最活跃设备
      this.fetchDeviceList().then(() => {
        if (this.deviceOptions.length > 0) {
          const mostActive = this.deviceOptions[0].value;
          if (mostActive !== this.selectedDeviceKey) {
            this.selectedDeviceKey = mostActive;
            this.selectedIndex = 0;
            this.selectedDeviceLabel = this.deviceOptions[0].label;
            this.onDeviceChange(this.selectedDeviceKey);
          }
        }
        this.fallbackLock = false;
      }).catch(() => {
        this.fallbackLock = false;
      });
    },

    // 启动数据超时检测（10秒无数据自动降级）
    startDataTimeoutTimer() {
      this.stopDataTimeoutTimer();
      this.dataTimeoutTimer = setTimeout(() => {
        this.onDataTimeout();
      }, this.dataTimeoutDuration);
    },

    // 重置数据超时检测（收到数据时调用）
    resetDataTimeoutTimer() {
      if (this.dataTimeoutTimer) {
        clearTimeout(this.dataTimeoutTimer);
        this.dataTimeoutTimer = setTimeout(() => {
          this.onDataTimeout();
        }, this.dataTimeoutDuration);
      }
    },

    // 停止数据超时检测
    stopDataTimeoutTimer() {
      if (this.dataTimeoutTimer) {
        clearTimeout(this.dataTimeoutTimer);
        this.dataTimeoutTimer = null;
      }
    },

    // 数据超时回调：切换到最活跃设备
    onDataTimeout() {
      if (this.fallbackLock) return;
      if (!this.selectedDeviceKey || this.deviceOptions.length === 0) return;

      const mostActiveKey = this.deviceOptions[0].value;
      // 如果当前设备就是最活跃设备，不再切换，但给出提示
      if (this.selectedDeviceKey === mostActiveKey) {
        uni.showToast({ title: '当前设备长时间无数据，请检查设备状态', icon: 'none', duration: 2000 });
        return;
      }

      this.fallbackLock = true;
      uni.showToast({ title: '当前设备长时间无数据，已为您切换到最新活跃设备', icon: 'none', duration: 2000 });
      this.selectedDeviceKey = mostActiveKey;
      this.selectedIndex = 0;
      this.selectedDeviceLabel = this.deviceOptions[0].label;
      this.onDeviceChange(this.selectedDeviceKey);
      // 延迟解锁，避免短时间内重复触发
      setTimeout(() => {
        this.fallbackLock = false;
      }, 2000);
    },

    // ========== WebSocket 连接与订阅 ==========
    connectWebSocket() {
      if (!this.selectedDeviceKey) return;
      if (this.socketTask && this.socketTask.readyState === 1) {
        console.log('WebSocket 已连接，无需重复连接');
        return;
      }
      if (this.connecting) return;

      this.connecting = true;
      this.error = null;

      this.socketTask = uni.connectSocket({
        url: WS_BASE_URL,
        success: () => console.log('WebSocket 连接创建成功'),
        fail: (err) => {
          console.error('WebSocket 连接创建失败', err);
          this.handleConnectionError();
        }
      });

      this.socketTask.onOpen(() => {
        console.log('WebSocket 连接已打开');
        this.connecting = false;
        this.reconnectAttempts = 0;
        if (this.socketTask) {
          this.sendStompConnect();
        }
        this.stopPolling();
      });

      this.socketTask.onMessage((res) => {
        this.handleStompMessage(res.data);
      });

      this.socketTask.onError((err) => {
        console.error('WebSocket 错误', err);
        this.handleConnectionError();
        this.startPolling();
      });

      this.socketTask.onClose(() => {
        console.log('WebSocket 连接已关闭');
        this.socketTask = null;
        this.connecting = false;
        this.startPolling();
        if (this.reconnectTimer === null) {
          this.reconnectWebSocket();
        }
      });
    },

    sendStompConnect() {
      const connectFrame = 'CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0';
      this.socketTask.send({ data: connectFrame, fail: (err) => console.error('发送 CONNECT 失败', err) });
    },

    sendStompSubscribe() {
      // 动态订阅当前设备的主题
      const topic = `/topic/environment/${this.selectedDeviceKey}`;
      const subscribeFrame = `SUBSCRIBE\nid:sub-0\ndestination:${topic}\nack:auto\n\n\0`;
      this.socketTask.send({ data: subscribeFrame, fail: (err) => console.error('发送 SUBSCRIBE 失败', err) });
    },

    handleStompMessage(data) {
      this.stompFrameBuffer += data;
      let nullIndex;
      while ((nullIndex = this.stompFrameBuffer.indexOf('\0')) !== -1) {
        const frameStr = this.stompFrameBuffer.substring(0, nullIndex);
        this.stompFrameBuffer = this.stompFrameBuffer.substring(nullIndex + 1);
        if (frameStr.trim().length === 0) continue;

        const lines = frameStr.split('\n');
        const command = lines[0];

        if (command === 'CONNECTED') {
          console.log('STOMP 连接成功，发送订阅');
          this.sendStompSubscribe();
        } else if (command === 'MESSAGE') {
          const bodyStartIndex = frameStr.indexOf('\n\n');
          if (bodyStartIndex !== -1) {
            let body = frameStr.substring(bodyStartIndex + 2);
            try {
              const messageData = JSON.parse(body);
              console.log('收到推送数据:', messageData);
              this.environmentData = messageData;
              // 收到推送数据，重置超时计时器
              this.resetDataTimeoutTimer();
              if (this.error) this.error = null;
              this.checkPendingCommand(messageData);
            } catch (e) {
              console.error('解析推送 JSON 失败', e, body);
            }
          }
        } else if (command === 'ERROR') {
          console.error('STOMP 错误帧:', frameStr);
          this.error = '实时数据连接出错，将尝试重连';
          this.disconnectWebSocket();
          this.reconnectWebSocket();
        }
      }
    },

    checkPendingCommand(data) {
      if (!this.pendingCommand) return;
      const { deviceType, action } = this.pendingCommand;
      let statusChanged = false;
      if (deviceType === 'fan') {
        const newStatus = data.fanStatus;
        const expected = action === 'on' ? 1 : 0;
        if (newStatus === expected) statusChanged = true;
      } else if (deviceType === 'led') {
        const newStatus = data.ledStatus;
        const expected = action === 'on' ? 1 : 0;
        if (newStatus === expected) statusChanged = true;
      }
      if (statusChanged) {
        if (this.commandTimeout) clearTimeout(this.commandTimeout);
        const deviceName = deviceType === 'fan' ? '散热器' : 'LED';
        uni.showToast({ title: `${deviceName}${action === 'on' ? '开启' : '关闭'}成功`, icon: 'success' });
        this.pendingCommand = null;
        if (deviceType === 'fan') this.fanLoading = false;
        else this.ledLoading = false;
      }
    },

    handleConnectionError() {
      this.error = '实时数据连接失败，正在尝试重连...';
      this.connecting = false;
      if (this.socketTask) {
        try { this.socketTask.close({}); } catch (e) {}
        this.socketTask = null;
      }
      this.reconnectWebSocket();
    },

    reconnectWebSocket() {
      if (this.reconnectTimer) return;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`将在 ${delay}ms 后尝试重连 WebSocket`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.connectWebSocket();
        this.reconnectTimer = null;
      }, delay);
    },

    disconnectWebSocket() {
      if (this.socketTask) {
        try {
          const disconnectFrame = 'DISCONNECT\n\n\0';
          this.socketTask.send({ data: disconnectFrame, fail: () => {} });
          this.socketTask.close({});
        } catch (e) {}
        this.socketTask = null;
      }
      this.connecting = false;
      this.stompFrameBuffer = '';
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    },

    startPolling() {
      if (this.pollingTimer) return;
      console.log('启用轮询降级');
      this.pollingTimer = setInterval(() => {
        if (!this.loading && this.selectedDeviceKey) {
          this.fetchData();
        }
      }, 5000);
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
        console.log('停止轮询');
      }
    },

    // ========== 设备反控 ==========
    async controlRadiator(action) {
      if (!this.selectedDeviceKey) {
        uni.showToast({ title: '请先选择设备', icon: 'none' });
        return;
      }
      if (this.pendingCommand) {
        uni.showToast({ title: '请等待上一次指令执行完成', icon: 'none' });
        return;
      }
      this.fanLoading = true;
      try {
        const res = await request({
          url: '/service/deviceOption/control',
          method: 'POST',
          data: {
            deviceType: 'fan',
            deviceKey: this.selectedDeviceKey,
            command: action
          },
          timeout: 3000
        });
        if (res.code === 20000) {
          this.pendingCommand = { deviceType: 'fan', action };
          uni.showToast({ title: '指令已发送，等待设备响应...', icon: 'none', duration: 2000 });
          this.commandTimeout = setTimeout(() => {
            if (this.pendingCommand && this.pendingCommand.deviceType === 'fan') {
              uni.showToast({ title: '设备响应超时，请检查网络或设备状态', icon: 'none' });
              this.pendingCommand = null;
              this.fanLoading = false;
              this.commandTimeout = null;
            }
          }, 5000);
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
          this.fanLoading = false;
        }
      } catch (err) {
        uni.showToast({ title: err.msg || '控制超时或失败', icon: 'none' });
        this.fanLoading = false;
      }
    },

    async controlLed(action) {
      if (!this.selectedDeviceKey) {
        uni.showToast({ title: '请先选择设备', icon: 'none' });
        return;
      }
      if (this.pendingCommand) {
        uni.showToast({ title: '请等待上一次指令执行完成', icon: 'none' });
        return;
      }
      this.ledLoading = true;
      try {
        const res = await request({
          url: '/service/deviceOption/control',
          method: 'POST',
          data: {
            deviceType: 'led',
            deviceKey: this.selectedDeviceKey,
            command: action
          },
          timeout: 3000
        });
        if (res.code === 20000) {
          this.pendingCommand = { deviceType: 'led', action };
          uni.showToast({ title: '指令已发送，等待设备响应...', icon: 'none', duration: 2000 });
          this.commandTimeout = setTimeout(() => {
            if (this.pendingCommand && this.pendingCommand.deviceType === 'led') {
              uni.showToast({ title: '设备响应超时，请检查网络或设备状态', icon: 'none' });
              this.pendingCommand = null;
              this.ledLoading = false;
              this.commandTimeout = null;
            }
          }, 5000);
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
          this.ledLoading = false;
        }
      } catch (err) {
        uni.showToast({ title: err.msg || '控制超时或失败', icon: 'none' });
        this.ledLoading = false;
      }
    }
  }
};
</script>

<style scoped>
/* 原有样式保持不变，新增空设备卡片样式 */
.device-card {
  margin-bottom: 20rpx;
}
.picker-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.arrow {
  font-size: 24rpx;
  color: #999;
}
.search-box {
  display: flex;
  margin-top: 20rpx;
  gap: 20rpx;
}
.search-box input {
  flex: 1;
  background-color: #f5f5f5;
  padding: 16rpx 24rpx;
  border-radius: 48rpx;
  font-size: 28rpx;
}
.search-box button {
  width: auto;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.empty-card {
  margin-top: 20rpx;
}
.empty-device-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
  color: #e6a23c;
}
.empty-text {
  font-size: 28rpx;
  color: #909399;
  margin-bottom: 30rpx;
}
.refresh-list-btn {
  width: 200rpx;
  margin-top: 20rpx;
}
/* 全局变量 */
:root {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --card-bg: #ffffff;
  --body-bg: #f5f7fa;
  --border-radius-lg: 24rpx;
  --border-radius-md: 16rpx;
  --box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.container {
  padding: 20rpx;
  background-color: var(--body-bg);
  min-height: 100vh;
  box-sizing: border-box;
}

/* 卡片通用样式 */
.card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius-lg);
  margin-bottom: 24rpx;
  box-shadow: var(--box-shadow);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card-header {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 24rpx 32rpx 32rpx;
}

/* 刷新按钮 */
.refresh-btn {
  font-size: 28rpx;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: none;
  border: none;
  padding: 8rpx 16rpx;
  border-radius: 40rpx;
  transition: all 0.2s;
}

.refresh-btn:active {
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(0.96);
}

.refresh-btn.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 数据行：使用 Grid 布局，响应式 */
.data-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 24rpx;
}

@media (max-width: 500rpx) {
  .data-row {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  align-items: center;
  background-color: #fafbfc;
  border-radius: var(--border-radius-md);
  padding: 20rpx 24rpx;
  transition: all 0.2s;
}

.info-item .label {
  width: 120rpx;
  font-size: 28rpx;
  color: #606266;
  font-weight: 500;
}

.info-item .value {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.full-width {
  grid-column: 1 / -1;
}

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 6rpx 20rpx;
  font-size: 24rpx;
  border-radius: 32rpx;
  background-color: #f4f4f5;
  color: #909399;
  font-weight: 500;
  text-align: center;
  min-width: 100rpx;
}

.tag-danger {
  background-color: #fef0f0;
  color: var(--danger-color);
}

.tag-success {
  background-color: #f0f9eb;
  color: var(--success-color);
}

.tag-warning {
  background-color: #fdf6ec;
  color: var(--warning-color);
}

.tag-primary {
  background-color: #ecf5ff;
  color: var(--primary-color);
}

.tag-info {
  background-color: #f4f4f5;
  color: var(--info-color);
}

/* 控制项布局 */
.control-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.control-row:last-child {
  border-bottom: none;
}

.control-icon {
  width: 100rpx;
  text-align: center;
  font-size: 60rpx;
  margin-right: 24rpx;
}

.control-info {
  flex: 1;
}

.control-label {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8rpx;
}

.control-status {
  font-size: 26rpx;
  color: #909399;
  margin-bottom: 20rpx;
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 80rpx;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  color: #606266;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  border: none;
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(64, 158, 255, 0.3);
}

.btn-danger {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  border: none;
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(245, 108, 108, 0.3);
}

.btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

button[disabled] {
  opacity: 0.5;
  transform: none;
  pointer-events: none;
}

/* 图标动画 */
.fan-icon, .led-icon {
  display: inline-block;
  font-size: 60rpx;
  transition: all 0.2s;
}

.fan-animate {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.led-on-glow {
  text-shadow: 0 0 12rpx #ffb347;
  filter: drop-shadow(0 0 8rpx #ffb347);
}

/* 加载与错误状态 */
.loading-mask, .error-mask {
  text-align: center;
  padding: 80rpx 32rpx;
  color: var(--info-color);
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.error-mask {
  color: var(--danger-color);
}

.error-mask .refresh-btn {
  background-color: var(--danger-color);
  color: white;
  padding: 12rpx 32rpx;
  border-radius: 80rpx;
  margin-top: 16rpx;
}

/* 等待指令提示 */
.pending-tip {
  margin-top: 20rpx;
  padding: 16rpx;
  background-color: #fdf6ec;
  border-radius: var(--border-radius-md);
  text-align: center;
  font-size: 26rpx;
  color: var(--warning-color);
}
</style>