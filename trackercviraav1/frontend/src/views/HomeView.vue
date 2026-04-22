<template>
  <div class="home">
    <div class="welcome-section">
      <h1>Welcome to CVIRAA Athlete Tracker System</h1>
      <p>Manage personnel, scan QR codes, and track event participants</p>
      <div class="quick-actions">
        <router-link to="/personnel" class="action-card">
          <h3>Personnel</h3>
          <p>View and manage all personnel</p>
        </router-link>
        <router-link to="/scanner" class="action-card">
          <h3>QR Scanner</h3>
          <p>Scan QR codes to verify personnel</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView'
}
</script>

<style scoped>
.home {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-section h1 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 32px;
}

.welcome-section p {
  color: #666;
  font-size: 18px;
  margin-bottom: 40px;
}

.quick-actions {
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 40px;
}

.action-card {
  flex: 1;
  min-width: 250px;
  max-width: 350px;
  padding: 30px;
  background: linear-gradient(135deg, #42b983 0%, #35a372 100%);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  transition: transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.action-card h3 {
  font-size: 24px;
  margin-bottom: 10px;
}

.action-card p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0;
}

@media (max-width: 768px) {
  .welcome-section h1 {
    font-size: 24px;
  }

  .welcome-section p {
    font-size: 16px;
  }

  .quick-actions {
    flex-direction: column;
  }

  .action-card {
    max-width: 100%;
  }
}
</style>
