import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiFileText, FiMic, FiBarChart2, FiUpload } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalStudents: 0,
    totalCalls: 0,
    activeAssignments: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [studentCalls, setStudentCalls] = useState([]);


  useEffect(() => {
    // Load professor data
    loadProfessorData();
  }, [user]);

  const loadProfessorData = async () => {
    try {
      // Load documents
      if (user?.id) {
        const docsResponse = await fetch(`/api/upload/pdfs/${user.id}`);
        if (docsResponse.ok) {
          const result = await docsResponse.json();
          if (result.success) {
            setDocuments(result.data);
            setStats(prev => ({ ...prev, totalDocuments: result.data.length }));
          }
        }
      }

      // Load student calls/conversations
      const callsResponse = await fetch('/api/conversations');
      if (callsResponse.ok) {
        const calls = await callsResponse.json();
        setStudentCalls(calls);
        setStats(prev => ({ 
          ...prev, 
          totalCalls: calls.length,
          totalStudents: new Set(calls.map(call => call.phoneNumber)).size
        }));
      }

      // Set recent activity
      setRecentActivity([
        { id: 1, type: 'upload', text: 'Uploaded "Introduction to Biology" PDF', time: '2 hours ago' },
        { id: 2, type: 'call', text: 'Student completed AI tutoring session', time: '1 day ago' },
        { id: 3, type: 'assignment', text: 'Created new assignment for Chemistry class', time: '2 days ago' }
      ]);
    } catch (error) {
      console.error('Error loading professor data:', error);
    }
  };

  const quickActions = [
    {
      title: 'Upload Course Materials',
      description: 'Upload PDFs and documents for your students',
      icon: FiUpload,
      link: '/upload',
      color: 'primary'
    },
    {
      title: 'AI Voice Tutor',
      description: 'Start an in-browser AI voice tutoring session for student learning',
      icon: FiMic,
      link: '/voice',
      color: 'secondary'
    }
  ];

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Welcome back, {user?.name || 'Professor'}!</h1>
          <p className="dashboard-subtitle">
            Manage your course materials and track student progress
          </p>
          
        </div>

        {/* Stats Overview */}
        <section className="stats-section" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="section-title">Course Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FiFileText />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalDocuments}</div>
                <div className="stat-label">Course Materials</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FiUsers />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalStudents}</div>
                <div className="stat-label">Active Students</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FiMic />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalCalls}</div>
                <div className="stat-label">AI Tutoring Sessions</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FiBarChart2 />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.activeAssignments}</div>
                <div className="stat-label">Active Assignments</div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="actions-section" aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Link
                  key={index}
                  to={action.link}
                  className={`action-card ${action.color}`}
                  aria-describedby={`action-${index}-description`}
                >
                  <div className="action-icon">
                    <IconComponent />
                  </div>
                  <div className="action-content">
                    <h3 className="action-title">{action.title}</h3>
                    <p id={`action-${index}-description`} className="action-description">
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'upload' ? <FiUpload /> : 
                   activity.type === 'call' ? <FiMic /> : 
                   activity.type === 'assignment' ? <FiFileText /> : <FiBookOpen />}
                </div>
                <div className="activity-content">
                  <p className="activity-text">{activity.text}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Course Materials */}
        <section className="materials-section" aria-labelledby="materials-heading">
          <h2 id="materials-heading" className="section-title">Course Materials</h2>
          <div className="materials-grid">
            {documents.slice(0, 4).map((doc) => (
              <div key={doc.id} className="material-card">
                <div className="material-icon">
                  <FiFileText />
                </div>
                <div className="material-content">
                  <h3 className="material-title">{doc.fileName}</h3>
                  <p className="material-meta">
                    {doc.flashcardCount} flashcards • {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="no-materials">
                <FiFileText className="no-materials-icon" />
                <p>No course materials uploaded yet</p>
                <Link to="/upload" className="upload-link">Upload your first document</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;