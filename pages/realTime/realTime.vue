<template>
  <view class="container">
    <!-- 实时数据卡片 -->
    <view class="card">
      <view class="card-header">
        <text>实时环境监测</text>
        <text class="refresh-btn" @click="fetchData" :class="{loading: loading}">⟳ 刷新</text>
      </view>
      <view class="card-body">
        <view v-if="connecting && !environmentData" class="loading-mask">
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

    <!-- 设备反控卡片 -->
    <view class="card">
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

// WebSocket 基础地址配置（请根据实际环境修改）
// 开发环境: 'ws://localhost:8080/ws/environment/websocket'
// 生产环境: 'wss://your-domain.com/ws/environment/websocket'
const WS_BASE_URL = 'ws://192.168.1.21:8080/ws/environment/websocket';

export default {
  data() {
    return {
      environmentData: null,      // 环境数据
      loading: false,             // HTTP刷新加载状态
      error: null,                // 错误信息
      
      // WebSocket 相关
      socketTask: null,           // WebSocket 连接实例
      connecting: false,          // 是否正在连接中
      reconnectTimer: null,       // 重连定时器
      reconnectAttempts: 0,       // 重连次数
      stompFrameBuffer: '',       // STOMP 帧接收缓冲区
      
      // 反控等待确认
      pendingCommand: null,       // { deviceType, action }
      commandTimeout: null,       // 超时定时器
      fanLoading: false,          // 散热器指令发送中标志
      ledLoading: false,           // LED指令发送中标志
	  pollingTimer: null   // 轮询定时器
    };
  },
  onShow() {
    // 页面显示时：获取初始数据，连接WebSocket
    this.fetchData();
    this.connectWebSocket();
  },
  onHide() {
    // 页面隐藏时断开WebSocket，停止重连
    this.disconnectWebSocket();
	this.stopPolling();   // 页面隐藏时停止轮询，节省资源
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
    }
  },
  onUnload() {
    this.disconnectWebSocket();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.commandTimeout) clearTimeout(this.commandTimeout);
  },
  methods: {
    // ========== HTTP 初始数据获取 ==========
    async fetchData() {
      this.loading = true;
      this.error = null;
      try {
        const res = await request({
          url: '/service/environment/getLastEnvironment',
          method: 'GET'
        });
        if (res && res.data) {
          this.environmentData = res.data;
        } else {
          throw new Error('数据格式错误');
        }
      } catch (err) {
        console.error('获取实时数据失败', err);
        this.error = err.msg || '获取数据失败，请检查网络';
      } finally {
        this.loading = false;
      }
    },
	startPolling() {
	  if (this.pollingTimer) return;
	  console.log('启用轮询降级');
	  this.pollingTimer = setInterval(() => {
		if (!this.loading) {
		  this.fetchData();   // 复用原有的 HTTP 获取数据方法
		}
	  }, 5000);   // 5秒轮询
	},

	stopPolling() {
	  if (this.pollingTimer) {
		clearInterval(this.pollingTimer);
		this.pollingTimer = null;
		console.log('停止轮询');
	  }
	},
    // ========== WebSocket STOMP 协议实现 ==========
    connectWebSocket() {
      if (this.socketTask && this.socketTask.readyState === 1) {
        console.log('WebSocket 已连接，无需重复连接');
        return;
      }
      if (this.connecting) return;
      
      this.connecting = true;
      this.error = null;
      
      // 创建 WebSocket 连接
      this.socketTask = uni.connectSocket({
        url: WS_BASE_URL,
        success: () => {
          console.log('WebSocket 连接创建成功');
        },
        fail: (err) => {
          console.error('WebSocket 连接创建失败', err);
          this.handleConnectionError();
        }
      });
      
      // 监听打开事件
      this.socketTask.onOpen(() => {
        console.log('WebSocket 连接已打开');
        this.connecting = false;
        this.reconnectAttempts = 0;
        // 连接成功后发送 STOMP CONNECT 帧
        this.sendStompConnect();
		this.stopPolling();        // 连接成功，停止轮询
      });
      
      // 监听消息事件
      this.socketTask.onMessage((res) => {
        this.handleStompMessage(res.data);
      });
      
      // 监听错误事件
      this.socketTask.onError((err) => {
        console.error('WebSocket 错误', err);
        this.handleConnectionError();
		this.startPolling();       // 连接错误，启动轮询降级
      });
      
      // 监听关闭事件
      this.socketTask.onClose(() => {
        console.log('WebSocket 连接已关闭');
        this.socketTask = null;
        this.connecting = false;
		this.startPolling();       // 连接关闭，启动轮询降级
        // 非主动断开时尝试重连
        if (this.reconnectTimer === null) {
          this.reconnectWebSocket();
        }
      });
    },
    
    // 发送 STOMP CONNECT 帧
    sendStompConnect() {
      const connectFrame = 'CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0';
      this.socketTask.send({
        data: connectFrame,
        fail: (err) => console.error('发送 CONNECT 失败', err)
      });
    },
    
    // 发送 STOMP SUBSCRIBE 帧
    sendStompSubscribe() {
      const subscribeFrame = 'SUBSCRIBE\nid:sub-0\ndestination:/topic/environment\nack:auto\n\n\0';
      this.socketTask.send({
        data: subscribeFrame,
        fail: (err) => console.error('发送 SUBSCRIBE 失败', err)
      });
    },
    
    // 处理接收到的 STOMP 消息（解析帧）
    handleStompMessage(data) {
      // 将数据追加到缓冲区
      this.stompFrameBuffer += data;
      // 按帧结束符 \0 分割
      let nullIndex;
      while ((nullIndex = this.stompFrameBuffer.indexOf('\0')) !== -1) {
        const frameStr = this.stompFrameBuffer.substring(0, nullIndex);
        this.stompFrameBuffer = this.stompFrameBuffer.substring(nullIndex + 1);
        if (frameStr.trim().length === 0) continue;
        
        // 解析帧
        const lines = frameStr.split('\n');
        const command = lines[0];
        
        // 处理 CONNECTED 响应
        if (command === 'CONNECTED') {
          console.log('STOMP 连接成功，发送订阅');
          this.sendStompSubscribe();
        }
        // 处理 MESSAGE 帧
        else if (command === 'MESSAGE') {
          // 查找空行分隔的 body
          const bodyStartIndex = frameStr.indexOf('\n\n');
          if (bodyStartIndex !== -1) {
            let body = frameStr.substring(bodyStartIndex + 2);
            // 移除末尾的 \0 (已经在分割时去掉)
            try {
              const messageData = JSON.parse(body);
              console.log('收到推送数据:', messageData);
              this.environmentData = messageData;
              if (this.error) this.error = null;
              // 检查是否匹配等待的指令
              this.checkPendingCommand(messageData);
            } catch (e) {
              console.error('解析推送 JSON 失败', e, body);
            }
          }
        }
        // 处理 ERROR 帧
        else if (command === 'ERROR') {
          console.error('STOMP 错误帧:', frameStr);
          this.error = '实时数据连接出错，将尝试重连';
          this.disconnectWebSocket();
          this.reconnectWebSocket();
        }
        // 处理 RECEIPT 等可忽略
      }
    },
    
    // 检查推送数据是否匹配等待的指令
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
        // 清除超时定时器
        if (this.commandTimeout) {
          clearTimeout(this.commandTimeout);
          this.commandTimeout = null;
        }
        // 清除等待状态
        const deviceName = deviceType === 'fan' ? '散热器' : 'LED';
        uni.showToast({
          title: `${deviceName}${action === 'on' ? '开启' : '关闭'}成功`,
          icon: 'success'
        });
        this.pendingCommand = null;
        // 重置对应的 loading 标志
        if (deviceType === 'fan') this.fanLoading = false;
        else this.ledLoading = false;
      }
    },
    
    // 处理连接错误并尝试重连
    handleConnectionError() {
      this.error = '实时数据连接失败，正在尝试重连...';
      this.connecting = false;
      if (this.socketTask) {
        try {
          this.socketTask.close({});
        } catch (e) {}
        this.socketTask = null;
      }
      this.reconnectWebSocket();
    },
    
    // 指数退避重连
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
    
    // 主动断开 WebSocket
    disconnectWebSocket() {
      if (this.socketTask) {
        try {
          // 发送 DISCONNECT 帧（可选）
          const disconnectFrame = 'DISCONNECT\n\n\0';
          this.socketTask.send({
            data: disconnectFrame,
            fail: () => {}
          });
          this.socketTask.close({});
        } catch (e) {}
        this.socketTask = null;
      }
      this.connecting = false;
      this.stompFrameBuffer = '';
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    },
    
    // ========== 设备反控 ==========
    async controlRadiator(action) {
      if (!this.environmentData) {
        uni.showToast({ title: '设备信息未加载', icon: 'none' });
        return;
      }
      // 已有等待指令，不允许重复操作
      if (this.pendingCommand) {
        uni.showToast({ title: '请等待上一次指令执行完成', icon: 'none' });
        return;
      }
      
      const deviceId = this.environmentData.deviceId;
      this.fanLoading = true;
      
      try {
        const res = await request({
          url: '/service/deviceOption/control',
          method: 'POST',
          data: {
            deviceType: 'fan',
            deviceId: deviceId,
            command: action
          },
          timeout: 3000
        });
        if (res.code === 20000) {
          // 设置等待确认
          this.pendingCommand = { deviceType: 'fan', action };
          uni.showToast({ title: '指令已发送，等待设备响应...', icon: 'none', duration: 2000 });
          // 设置超时（5秒）
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
      if (!this.environmentData) {
        uni.showToast({ title: '设备信息未加载', icon: 'none' });
        return;
      }
      if (this.pendingCommand) {
        uni.showToast({ title: '请等待上一次指令执行完成', icon: 'none' });
        return;
      }
      
      const deviceId = this.environmentData.deviceId;
      this.ledLoading = true;
      
      try {
        const res = await request({
          url: '/service/deviceOption/control',
          method: 'POST',
          data: {
            deviceType: 'led',
            deviceId: deviceId,
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