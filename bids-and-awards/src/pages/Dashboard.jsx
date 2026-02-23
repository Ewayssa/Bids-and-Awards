import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Calendar from '../components/Calendar';

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
  const [data, setData] = useState({ pieData: [10, 20, 30], calendarEvents: [] });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/dashboard')
      .then(res => res.json())
      .then(setData)
      .catch(err => {
        console.error('Failed to fetch dashboard data:', err);
        setData({ pieData: [10, 20, 30], calendarEvents: [] }); // Fallback data
      });
  }, []);

  const [ongoing, completed, pending] = data.pieData;
  const totalDocs = data.pieData.reduce((a, b) => a + b, 0) || 0;

  // Professional color palette
  const chartColors = ['#ca8a04', '#166534', '#b91c1c']; // Amber-600, Green-800, Red-700
  const chartLabels = ['Ongoing', 'Completed', 'Pending'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of procurement documents and status</p>
        </div>
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Stats Grid */}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Documents</h3>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mb-1">{totalDocs}</p>
          <p className="text-xs text-gray-500">All registered files</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completed</h3>
            <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mb-1">{completed}</p>
          <p className="text-xs text-green-600 flex items-center gap-1">
            Process finished
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ongoing</h3>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mb-1">{ongoing}</p>
          <p className="text-xs text-amber-600">Active bids</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending</h3>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mb-1">{pending}</p>
          <p className="text-xs text-red-600">Requires attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Document Status Distribution</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-full max-w-md h-64">
              <Pie
                data={{
                  labels: chartLabels,
                  datasets: [{
                    data: data.pieData,
                    backgroundColor: chartColors,
                    hoverBackgroundColor: ['#ca8a04', '#166534', '#b91c1c'], // Keep same or slightly lighter
                    borderWidth: 0,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      titleColor: '#111827',
                      bodyColor: '#374151',
                      borderColor: '#e5e7eb',
                      borderWidth: 1,
                      padding: 12,
                      displayColors: true,
                      callbacks: {
                        label: function (context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = Math.round((context.parsed / total) * 100);
                          return ` ${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Custom Legend */}
            <div className="flex flex-wrap gap-6 justify-center mt-8">
              {chartLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i] }}></span>
                  <span className="text-sm font-medium text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Upcoming Events</h3>
          </div>
          <div className="p-6">
            <Calendar
              events={data.calendarEvents}
              currentMonth={currentMonth}
              currentYear={currentYear}
              goToPreviousMonth={goToPreviousMonth}
              goToNextMonth={goToNextMonth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

