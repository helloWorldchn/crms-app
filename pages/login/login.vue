<template>
  <view class="login-container">
    <view class="login-card">
      <view class="logo-area">
        <text class="logo-icon">📡</text>
        <text class="app-name">机房监控系统-CRMS</text>
      </view>
      <view class="form-area">
        <view class="input-item">
          <text class="input-label">账号</text>
          <input 
            class="input-field" 
            v-model="username" 
            placeholder="请输入用户名" 
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-item">
          <text class="input-label">密码</text>
          <input 
            class="input-field" 
            type="password" 
            v-model="password" 
            placeholder="请输入密码" 
            placeholder-class="placeholder"
            @confirm="handleLogin"
          />
        </view>
        <button class="login-btn" :loading="loading" @click="handleLogin">登 录</button>
        <view class="demo-tip">演示账号: admin / 123456</view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js';

export default {
  data() {
    return {
      username: 'admin',
      password: '123456',
      loading: false
    };
  },
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        uni.showToast({ title: '请输入账号和密码', icon: 'none' });
        return;
      }
      this.loading = true;
      try {
        // 假设后端登录接口为 /auth/login，返回 { code:20000, data:{ token } }
        const res = await request({
          url: '/index/login',
          method: 'POST',
          data: {
            username: this.username,
            password: this.password
          }
        });
        // 存储 token
        if (res.data && res.data.token) {
          uni.setStorageSync('access_token', res.data.token);
          uni.showToast({ title: '登录成功', icon: 'success' });
          // 跳转到 tabbar 页面
          uni.switchTab({ url: '/pages/realTime/realTime' });
        } else {
          throw new Error('登录返回数据异常');
        }
      } catch (err) {
        console.error(err);
        uni.showToast({ title: err.msg || '登录失败，请检查账号密码', icon: 'none' });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
}
.login-card {
  width: 100%;
  max-width: 340px;
  background-color: #ffffff;
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
.logo-area {
  text-align: center;
  margin-bottom: 32px;
}
.logo-icon {
  font-size: 56px;
  display: block;
}
.app-name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-top: 12px;
  display: inline-block;
}
.form-area {
  margin-top: 8px;
}
.input-item {
  margin-bottom: 20px;
}
.input-label {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}
.input-field {
  width: 100%;
  padding: 12px 0;
  border-bottom: 1px solid #e2e2e2;
  font-size: 16px;
}
.placeholder {
  color: #c0c4cc;
}
.login-btn {
  width: 100%;
  background-color: #409eff;
  color: white;
  border-radius: 44px;
  height: 48px;
  line-height: 48px;
  font-size: 16px;
  margin-top: 24px;
  border: none;
}
.demo-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 20px;
}
</style>