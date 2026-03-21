<!-- <script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
 -->
 <script>
 export default {
   onLaunch: function() {
     console.log('App Launch');
     const token = uni.getStorageSync('access_token');
     if (!token) {
       uni.reLaunch({
         url: '/pages/login/login'
       });
     }
   }
 };
 </script>
 
 <style>
 /* 全局样式 */
 page {
   background-color: #f5f7fa;
 }
 </style>