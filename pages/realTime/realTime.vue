<template>
  <view class="container">
    <!-- 实时数据卡片 -->
    <view class="card">
      <view class="card-header">
        <text>实时环境监测</text>
        <text class="refresh-btn" @click="fetchData" :class="{loading: loading}">⟳ 刷新</text>
      </view>
      <view class="card-body">
        <view v-if="loading && !environmentData" class="loading-mask">
          <text>加载中...</text>
        </view>
        <view v-else-if="error" class="error-mask">
          <text>{{ error }}</text>
          <text class="refresh-btn" @click="fetchData">重试</text>
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
                :disabled="fanLoading || (environmentData && environmentData.fanStatus === 1)"
                @click="controlRadiator('on')"
              >打开</button>
              <button 
                class="btn btn-danger" 
                :disabled="fanLoading || (environmentData && environmentData.fanStatus === 0)"
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
                :disabled="ledLoading || (environmentData && environmentData.ledStatus === 1)"
                @click="controlLed('on')"
              >打开</button>
              <button 
                class="btn btn-danger" 
                :disabled="ledLoading || (environmentData && environmentData.ledStatus === 0)"
                @click="controlLed('off')"
              >关闭</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js';

export default {
  data() {
    return {
      environmentData: null,
      loading: false,
      error: null,
      timer: null,
      fanLoading: false,
      ledLoading: false
    };
  },
  onShow() {
    // 页面显示时拉取数据并启动轮询
    this.fetchData();
    this.startPolling();
  },
  onHide() {
    // 页面隐藏时停止轮询，节省资源
    this.stopPolling();
  },
  onUnload() {
    this.stopPolling();
  },
  methods: {
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
    async controlRadiator(action) {
      if (!this.environmentData) {
        uni.showToast({ title: '设备信息未加载', icon: 'none' });
        return;
      }
      const deviceId = this.environmentData.deviceId;
      const targetStatus = action === 'on' ? 1 : 0;
      const oldStatus = this.environmentData.fanStatus;
      // 乐观更新
      this.environmentData.fanStatus = targetStatus;
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
          uni.showToast({ title: `散热器${action === 'on' ? '开启' : '关闭'}成功`, icon: 'success' });
          // 可选再次刷新确保同步，但乐观更新已改
        } else {
          // 回滚
          this.environmentData.fanStatus = oldStatus;
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
        }
      } catch (err) {
        this.environmentData.fanStatus = oldStatus;
        uni.showToast({ title: err.msg || '控制超时或失败', icon: 'none' });
      } finally {
        this.fanLoading = false;
      }
    },
    async controlLed(action) {
      if (!this.environmentData) return;
      const deviceId = this.environmentData.deviceId;
      const targetStatus = action === 'on' ? 1 : 0;
      const oldStatus = this.environmentData.ledStatus;
      this.environmentData.ledStatus = targetStatus;
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
          uni.showToast({ title: `LED${action === 'on' ? '打开' : '关闭'}成功`, icon: 'success' });
        } else {
          this.environmentData.ledStatus = oldStatus;
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
        }
      } catch (err) {
        this.environmentData.ledStatus = oldStatus;
        uni.showToast({ title: err.msg || '控制超时', icon: 'none' });
      } finally {
        this.ledLoading = false;
      }
    },
    startPolling() {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        // 页面可见时才拉取数据，避免后台频繁请求
        if (!this.loading) {
          this.fetchData();
        }
      }, 5000);
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
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

/* 当屏幕宽度小于 500rpx 时改为单列 */
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

.loading-mask text:first-child {
  font-size: 40rpx;
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
</style>

<!-- <style scoped>
/* 复用全局卡片样式，补充细节 */
.fan-icon, .led-icon {
  font-size: 44px;
  display: inline-block;
}
.fan-animate {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.led-on-glow {
  text-shadow: 0 0 8px #ffb347;
}
.refresh-btn.loading {
  opacity: 0.6;
}
.btn {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  padding: 6px 18px;
  font-size: 13px;
  border-radius: 30px;
}
.btn-primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #fff;
}
.btn-danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}
button[disabled] {
  opacity: 0.5;
}
</style> -->