<template>
  <div class="about">
    <div class="about-content">
      <h1>About SDO Lapu-Lapu City CVIRAA Athlete Tracker System</h1>
      <div class="info-section">
        <h2>System Overview</h2>
        <p>
          This system is designed to track athletes for CVIRAA events, including students, coaches, and trainers
          across various sports and activities.
        </p>
      </div>
      
      <div class="info-section">
        <h2>Features</h2>
        <ul>
          <li>Personnel Management - Add, edit, and delete personnel records</li>
          <li>QR Code Generation - Automatic QR code generation for each personnel</li>
          <li>QR Code Scanning - Verify personnel using QR codes</li>
          <li>Filtering & Search - Filter by role, event type, or search by name</li>
          <li>Profile Pictures - Upload and manage profile pictures</li>
          <li>Status Tracking - Track personnel status (In/Out)</li>
        </ul>
      </div>

      <div class="info-section">
        <h2>Event Types</h2>
        <p>The system supports 27 different event types including:</p>
        <ul>
          <li>Archery, Arnis, Athletics, Badminton, Baseball, Basketball</li>
          <li>Billiard, BOCCE, Boxing, Chess, Dancesport</li>
          <li>Football, Futsal, Gymnastics (various types)</li>
          <li>Lawn Tennis, Sepak Takraw, Softball, Swimming</li>
          <li>Table Tennis, Taekwondo, Volleyball, and more</li>
        </ul>
      </div>

      <div class="info-section">
        <h2>Roles</h2>
        <ul>
          <li><strong>Student</strong> - Event participants</li>
          <li><strong>Coach</strong> - Coaching staff</li>
          <li><strong>Trainer</strong> - Training personnel</li>
        </ul>
      </div>

      <div class="info-section">
        <h2>Development Team</h2>
        <ul>
          
          <li><strong>Backend Developer</strong> - John Vincent Ong</li>
          <li><strong>Frontend Developer</strong> - Jon Daniel Cabansay</li>
          <li><strong>Graphic Designer</strong> - Kaye Delgado</li>
          <li><strong>Graphic Designer</strong> - Shirlyn Canlom</li>
          <li><strong>Project Manager</strong> - Vincent Marc Palomares</li>
        </ul>
      </div>

      <h1>Version 1.0.0</h1>
    </div>
  </div>
</template>

<style scoped>
.about {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.about-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.about-content h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.info-section {
  margin-bottom: 30px;
}

.info-section h2 {
  color: #42b983;
  margin-bottom: 15px;
  font-size: 22px;
}

.info-section p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.info-section ul {
  list-style-type: none;
  padding-left: 0;
}

.info-section li {
  color: #666;
  line-height: 1.8;
  padding-left: 20px;
  position: relative;
}

.info-section li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #42b983;
  font-weight: bold;
}

.info-section strong {
  color: #2c3e50;
}

@media (max-width: 768px) {
  .about-content {
    padding: 20px;
  }

  .about-content h1 {
    font-size: 24px;
  }

  .info-section h2 {
    font-size: 18px;
  }
}
</style>
