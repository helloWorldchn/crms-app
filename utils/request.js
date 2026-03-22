const BASE_URL = 'http://192.168.1.21:8080'; // 替换为你的后端地址

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('access_token');
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      timeout: options.timeout || 10000,
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 20000) {
            resolve(res.data);
          } else if (res.data.code === 401 || res.data.code === 403) {
            uni.removeStorageSync('access_token');
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/login' });
            }, 1500);
            reject(res.data);
          } else {
            reject(res.data);
          }
        } else {
          reject({ msg: '网络请求失败', statusCode: res.statusCode });
        }
      },
      fail: (err) => {
        reject({ msg: '网络异常，请检查网络', err });
      }
    });
  });
};

export default request;