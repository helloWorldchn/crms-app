<template>
  <view class="history-container">
    <!-- 顶部传感器 Tab -->
    <scroll-view scroll-x class="sensor-tabs" :scroll-with-animation="true">
      <view class="tab-list">
        <view
          v-for="item in sensorTypes"
          :key="item.value"
          class="tab-item"
          :class="{ active: currentSensor === item.value }"
          @click="switchSensor(item.value)"
        >
          {{ item.label+"("+item.unit+")" }}
        </view>
      </view>
    </scroll-view>

    <!-- 时间范围选择 -->
    <view class="time-range">
      <view class="range-buttons">
        <view
          v-for="range in timeRanges"
          :key="range.value"
          class="range-btn"
          :class="{ active: currentRange === range.value }"
          @click="switchRange(range.value)"
        >
          {{ range.label }}
        </view>
        <view class="range-btn custom" @click="showCustomDate = true">
          自定义
        </view>
      </view>
      <view class="custom-date-range" v-if="showCustomDate">
        <view class="date-item">
          <text>开始时间：</text>
          <picker mode="date" :value="customStartDate" @change="onStartDateChange">
            <view class="picker">{{ customStartDate || '请选择' }}</view>
          </picker>
        </view>
        <view class="date-item">
          <text>结束时间：</text>
          <picker mode="date" :value="customEndDate" @change="onEndDateChange">
            <view class="picker">{{ customEndDate || '请选择' }}</view>
          </picker>
        </view>
        <view class="date-buttons">
          <button class="confirm-btn" @click="confirmCustomDate">确定</button>
          <button class="cancel-btn" @click="showCustomDate = false">取消</button>
        </view>
      </view>
      <view class="selected-date" v-if="customStartTime">
        {{ formatDate(customStartTime) }} 至 {{ formatDate(customEndTime) }}
      </view>
    </view>

    <!-- 图表区域 - 使用 qiun-data-charts 组件 -->
    <view class="chart-card">
      <view class="chart-header">
        <view class="chart-title">{{ currentSensorLabel }}变化趋势</view>
        <view class="chart-type-switch">
          <view
            :class="['switch-btn', { active: chartType === 'line' }]"
            @click="switchChartType('line')"
          >折线图</view>
          <view
            :class="['switch-btn', { active: chartType === 'column' }]"
            @click="switchChartType('column')"
          >柱状图</view>
        </view>
      </view>
      <view class="chart-container">
        <qiun-data-charts
		  :key="chartType"
          :type="chartType"
          :opts="chartOpts"
          :chartData="chartData"
          :canvas2d="true"
          tooltipFormat="tooltipDemo1"
        />
      </view>
    </view>

    <!-- 数据列表 -->
    <view class="list-card">
      <view class="list-header">
        <text class="list-title">历史数据明细</text>
        <text class="list-tip">共 {{ historyList.length }} 条</text>
      </view>
      <scroll-view scroll-y class="data-list" @scrolltolower="loadMore" :enable-back-to-top="true">
        <view v-if="historyList.length === 0 && !loading" class="empty-list">
          <text>暂无数据</text>
        </view>
        <view
          v-for="(item, index) in displayList"
          :key="item.id"
          class="list-item"
          @click="showDetail(item)"
        >
          <text class="item-time">{{ formatTime(item.gmtMeasurement) }}</text>
          <text class="item-value">{{ getValueBySensor(item) }} {{ currentUnit }}</text>
        </view>
        <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
          加载更多...
        </view>
        <view v-if="!hasMore && historyList.length > 0" class="no-more">
          没有更多了
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js';
import QiunDataCharts from '@/uni_modules/qiun-data-charts/components/qiun-data-charts/qiun-data-charts.vue'
import QiunLoading from '@/uni_modules/qiun-data-charts/components/qiun-loading/qiun-loading.vue'

export default {
  components: { QiunDataCharts, QiunLoading },
  data() {
    return {
      sensorTypes: [
        { label: '温度', value: 'temperature', unit: '°C' },
        { label: '湿度', value: 'humidity', unit: '%' },
        { label: '气体浓度', value: 'gasPpm', unit: 'ppm' },
        { label: '光照强度', value: 'lightPercentage', unit: '%' },
        { label: '明火概率', value: 'flamePercentage', unit: '%' }
      ],
      currentSensor: 'temperature',
      timeRanges: [
        { label: '全部', value: 'all' },
        { label: '今日', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' }
      ],
      currentRange: 'all',
      customStartTime: null,
      customEndTime: null,
      // uCharts 2.x 柱状图类型是 'column' 不是 'bar'
      chartType: 'line',
      // 图表数据和配置
      chartData: {},
      chartOpts: {
        color: ["#409eff"],
        padding: [15, 15, 0, 5],
        enableScroll: false,
		legend: {
			show: false,          // true:启用图例；false:关闭图例
			position: 'top',     // 图例位置：top / bottom / left / right
			align: 'center',     // 对齐方式：left / center / right（在水平位置时有效）
			lineHeight: 20,      // 行高（单位px）
			fontSize: 12,        // 字体大小
			fontColor: '#666',   // 字体颜色
			borderWidth: 0,      // 边框宽度
			borderColor: '#ccc', // 边框颜色
			padding: 10,         // 内边距
			margin: 10,          // 外边距
			backgroundColor: 'rgba(255,255,255,0.9)', // 背景色
			// 还可以设置自定义图例项的形状、样式等
		},
        xAxis: {
          disableGrid: true,
          rotateLabel: true,
          itemCount: 10,
          fontSize: 10
        },
        yAxis: {
          data: [{ min: 0 }]
        },
        extra: {
          line: {
            type: 'straight',
			point: { show: false }  // 隐藏折线图上的数据点
          },
          column: {
            type: 'group',
            width: 12
          }
        }
      },
      historyList: [],
      displayList: [],
      loading: false,
      pageSize: 20,
      currentPage: 1,
      showCustomDate: false,
      customStartDate: '',
      customEndDate: ''
    };
  },
  computed: {
    currentSensorLabel() {
      const found = this.sensorTypes.find(s => s.value === this.currentSensor);
      return found ? found.label : '';
    },
    currentUnit() {
      const found = this.sensorTypes.find(s => s.value === this.currentSensor);
      return found ? found.unit : '';
    },
    hasMore() {
      return this.displayList.length < this.historyList.length;
    }
  },
  watch: {
    currentSensor() {
      this.resetAndFetch();
    },
    currentRange() {
      this.resetAndFetch();
    },
    customStartTime() {
      this.resetAndFetch();
    }
  },
  mounted() {
    this.fetchHistory();
  },
  methods: {
    // 切换图表类型
    switchChartType(type) {
      this.chartType = type;
    },
    
    async fetchHistory() {
      this.loading = true;
      try {
        const params = {
          begin: this.getStartTime(),
          end: this.getEndTime()
        };
        const res = await request({
          url: '/service/environment/statistics',
          method: 'POST',
          data: params
        });
        if (res.code === 20000 && res.data) {
          this.historyList = res.data || [];
          this.currentPage = 1;
          this.updateDisplayList();
          // 更新图表数据
          this.updateChartData();
        } else {
          uni.showToast({ title: res.msg || '获取数据失败', icon: 'none' });
        }
      } catch (err) {
        uni.showToast({ title: err.msg || '网络异常，请重试', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    
    // 更新图表数据
    updateChartData() {
      if (this.historyList.length === 0) {
        this.chartData = {};
        return;
      }
      // 按测量时间升序排序
      const sortedData = [...this.historyList].sort((a, b) => 
        new Date(a.gmtMeasurement) - new Date(b.gmtMeasurement)
      );
      
      // 限制数据点数量，避免图表过于拥挤（最多显示20个点）
      const maxPoints = 15;
      const step = Math.ceil(sortedData.length / maxPoints);
      const sampledData = sortedData.filter((_, index) => index % step === 0).slice(0, maxPoints);
      
      const categories = sampledData.map(item => this.formatTimeShort(item.gmtMeasurement));
      const seriesData = sampledData.map(item => {
        const val = item[this.currentSensor];
        return val !== undefined ? val : 0;
      });
      
      this.chartData = {
        categories: categories,
        series: [{
          name: this.currentSensorLabel+"("+this.currentUnit+")",
          name: this.currentSensorLabel+"("+this.currentUnit+")",
          data: seriesData
        }]
      };
    },
    
    updateDisplayList() {
      const start = 0;
      const end = this.currentPage * this.pageSize;
      this.displayList = this.historyList.slice(start, end);
    },
    
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.currentPage++;
        this.updateDisplayList();
      }
    },
    
    resetAndFetch() {
      this.fetchHistory();
    },
    
    switchSensor(sensor) {
      this.currentSensor = sensor;
    },
    
    switchRange(range) {
      this.currentRange = range;
      this.customStartTime = null;
      this.customEndTime = null;
      this.showCustomDate = false;
      this.customStartDate = '';
      this.customEndDate = '';
    },
    
    getStartTime() {
      if (this.customStartTime) {
        return this.formatToBackendDatetime(this.customStartTime);
      }
      switch (this.currentRange) {
        case 'all':
          return '';
        case 'today':
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          return this.formatToBackendDatetime(todayStart);
        case 'week':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          return this.formatToBackendDatetime(weekStart);
        case 'month':
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - 1);
          monthStart.setHours(0, 0, 0, 0);
          return this.formatToBackendDatetime(monthStart);
        default:
          return '';
      }
    },
    
    getEndTime() {
      if (this.customEndTime) {
        return this.formatToBackendDatetime(this.customEndTime);
      }
      switch (this.currentRange) {
        case 'all':
          return '';
        case 'today':
        case 'week':
        case 'month':
          const now = new Date();
          return this.formatToBackendDatetime(now);
        default:
          return '';
      }
    },
    
    formatToBackendDatetime(date) {
      let d = date;
      if (typeof date === 'string') {
        d = new Date(date);
      }
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        return '';
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    },
    
    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const second = date.getSeconds();
      return `${year}-${month}-${day} ${hour}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    },
    
    formatTimeShort(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const second = date.getSeconds();
      return `${month}-${day} ${hour}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    },
    getValueBySensor(item) {
      const val = item[this.currentSensor];
      return val !== undefined ? val : '--';
    },
    
    showDetail(item) {
      uni.showModal({
        title: '详细信息',
        content: `时间：${item.gmtMeasurement}\n${this.currentSensorLabel}：${this.getValueBySensor(item)} ${this.currentUnit}`,
        showCancel: false
      });
    },
    
    onStartDateChange(e) {
      this.customStartDate = e.detail.value;
    },
    
    onEndDateChange(e) {
      this.customEndDate = e.detail.value;
    },
    
    confirmCustomDate() {
      if (!this.customStartDate || !this.customEndDate) {
        uni.showToast({ title: '请选择完整的日期范围', icon: 'none' });
        return;
      }
      const start = new Date(this.customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(this.customEndDate);
      end.setHours(23, 59, 59, 999);
      this.customStartTime = start;
      this.customEndTime = end;
      this.showCustomDate = false;
    }
  }
};
</script>

<style scoped>
.history-container {
  background-color: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 30rpx;
}
.sensor-tabs {
  background-color: #fff;
  white-space: nowrap;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 20rpx;
}
.tab-list {
  display: inline-flex;
}
.tab-item {
  display: inline-block;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #606266;
  position: relative;
}
.tab-item.active {
  color: #409eff;
  font-weight: 500;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background-color: #409eff;
  border-radius: 2rpx;
}
.time-range {
  background-color: #fff;
  padding: 20rpx;
  margin-top: 12rpx;
}
.range-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.range-btn {
  padding: 12rpx 24rpx;
  border-radius: 60rpx;
  background-color: #f4f4f5;
  font-size: 26rpx;
  color: #606266;
}
.range-btn.active {
  background-color: #409eff;
  color: #fff;
}
.range-btn.custom {
  background-color: #fff;
  border: 1px solid #dcdfe6;
}
.selected-date {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #909399;
  text-align: center;
}
.custom-date-range {
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 16rpx;
}
.date-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.date-item text {
  width: 140rpx;
  font-size: 28rpx;
  color: #606266;
}
.picker {
  flex: 1;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-radius: 12rpx;
  border: 1px solid #e4e7ed;
  font-size: 28rpx;
}
.date-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}
.confirm-btn, .cancel-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 60rpx;
  font-size: 28rpx;
  text-align: center;
}
.confirm-btn {
  background-color: #409eff;
  color: #fff;
}
.cancel-btn {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  color: #606266;
}
.chart-card {
  background-color: #fff;
  border-radius: 24rpx;
  margin: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.chart-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}
.chart-type-switch {
  display: flex;
  gap: 20rpx;
}
.switch-btn {
  padding: 6rpx 20rpx;
  border-radius: 40rpx;
  background-color: #f4f4f5;
  font-size: 24rpx;
  color: #606266;
}
.switch-btn.active {
  background-color: #409eff;
  color: #fff;
}
.chart-container {
  width: 100%;
  height: 400rpx;
}
.list-card {
  background-color: #fff;
  border-radius: 24rpx;
  margin: 0 20rpx;
  overflow: hidden;
}
.list-header {
  display: flex;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1px solid #f0f0f0;
}
.list-title {
  font-size: 30rpx;
  font-weight: 600;
}
.list-tip {
  font-size: 24rpx;
  color: #909399;
}
.data-list {
  max-height: 600rpx;
}
.list-item {
  display: flex;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1px solid #f5f5f5;
}
.item-time {
  font-size: 26rpx;
  color: #606266;
}
.item-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #409eff;
}
.empty-list, .load-more, .no-more {
  text-align: center;
  padding: 40rpx;
  color: #909399;
  font-size: 26rpx;
}
</style>