import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

// Web-specific CSS styling injection
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'taskflow-global-css';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = `
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      body {
        margin: 0;
        padding: 0;
        background-color: #0B0F17;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        color: #F1F5F9;
        overflow-x: hidden;
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0F172A;
      }
      ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
      input, textarea, button, select {
        outline: none;
      }
    `;
    document.head.appendChild(styleTag);
  }
}

// Interfaces & Types
export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  createdAt: number;
}

const STORAGE_KEY = '@taskflow_tasks_v2';

// Default initial tasks
const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Build modern TaskFlow Dashboard',
    description: 'Design interactive summary cards, responsive widgets, and task progress indicators.',
    priority: 'high',
    status: 'completed',
    dueDate: '2026-10-14',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'task-2',
    title: 'Implement LocalStorage Synchronization',
    description: 'Ensure tasks persist across web browser refreshes with automated fallback hydration.',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-10-18',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'task-3',
    title: 'Mobile & Desktop Responsive Testing',
    description: 'Verify cross-platform breakpoints, touch targets, and flexible grid cards.',
    priority: 'high',
    status: 'pending',
    dueDate: '2026-10-20',
    createdAt: Date.now(),
  },
  {
    id: 'task-4',
    title: 'Task Filtering & Search Optimization',
    description: 'Allow instant multi-attribute filtering by status, priority, and text search query.',
    priority: 'low',
    status: 'pending',
    dueDate: '2026-10-22',
    createdAt: Date.now() + 86400000,
  },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const isTablet = width >= 640 && width < 860;

  // Task list state
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    }
    return INITIAL_TASKS;
  });

  // Save tasks to localStorage
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.warn('Error writing to localStorage:', e);
      }
    }
  }, [tasks]);

  // Form states for Add/Edit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<Status>('pending');
  const [dueDate, setDueDate] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Delete confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, completionRate };
  }, [tasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('pending');
    setDueDate('');
    setEditingTaskId(null);
    setValidationError(null);
    if (!isDesktop) {
      setIsFormVisible(false);
    }
  };

  // Handle Add / Edit Submission
  const handleSubmitTask = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Task title cannot be empty.');
      return;
    }

    setValidationError(null);

    if (editingTaskId) {
      // Update existing task
      setTasks((prev) =>
        prev.map((item) =>
          item.id === editingTaskId
            ? {
              ...item,
              title: trimmedTitle,
              description: description.trim(),
              priority,
              status,
              dueDate: dueDate.trim() || item.dueDate,
            }
            : item
        )
      );
    } else {
      // Create new task
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: trimmedTitle,
        description: description.trim(),
        priority,
        status,
        dueDate: dueDate.trim() || new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    resetForm();
  };

  // Start Editing Task
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate);
    setValidationError(null);
    setIsFormVisible(true);
  };

  // Toggle Complete / Pending
  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const newStatus: Status = task.status === 'completed' ? 'pending' : 'completed';
          return { ...task, status: newStatus };
        }
        return task;
      })
    );
  };

  // Cycle status: pending -> in_progress -> completed -> pending
  const handleCycleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          let nextStatus: Status = 'pending';
          if (task.status === 'pending') nextStatus = 'in_progress';
          else if (task.status === 'in_progress') nextStatus = 'completed';
          else nextStatus = 'pending';
          return { ...task, status: nextStatus };
        }
        return task;
      })
    );
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (taskToDelete) {
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      if (editingTaskId === taskToDelete.id) {
        resetForm();
      }
      setTaskToDelete(null);
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />

      {/* Main Scrollable View */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainWrapper, isDesktop && styles.mainWrapperDesktop]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Ionicons name="checkbox-outline" size={26} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.appTitle}>TaskFlow</Text>
                <Text style={styles.appSubtitle}>Smart Task & Productivity Management</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.headerButton, isFormVisible && styles.headerButtonActive]}
                onPress={() => {
                  if (isFormVisible && !editingTaskId) {
                    setIsFormVisible(false);
                  } else {
                    resetForm();
                    setIsFormVisible(true);
                  }
                }}
              >
                <Ionicons
                  name={isFormVisible && !editingTaskId ? 'close' : 'add'}
                  size={20}
                  color="#F8FAFC"
                />
                <Text style={styles.headerButtonText}>
                  {isFormVisible && !editingTaskId ? 'Close Form' : 'New Task'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Dashboard Summary Cards */}
          <View style={styles.statsGrid}>
            {/* Total Tasks Card */}
            <View style={[styles.statCard, { borderLeftColor: '#38BDF8' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Total Tasks</Text>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="folder-open-outline" size={20} color="#38BDF8" />
                </View>
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statSubtext}>{stats.completionRate}% overall completed</Text>
            </View>

            {/* Completed Tasks Card */}
            <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Completed</Text>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color="#10B981" />
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
              <Text style={styles.statSubtext}>Finished and verified</Text>
            </View>

            {/* In Progress Tasks Card */}
            <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>In Progress</Text>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.inProgress}</Text>
              <Text style={styles.statSubtext}>Currently active tasks</Text>
            </View>

            {/* Pending Tasks Card */}
            <View style={[styles.statCard, { borderLeftColor: '#A855F7' }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Pending</Text>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#A855F7" />
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#A855F7' }]}>{stats.pending}</Text>
              <Text style={styles.statSubtext}>Waiting to start</Text>
            </View>
          </View>

          {/* Form and Content Layout */}
          <View style={[styles.contentLayout, isDesktop && styles.contentLayoutDesktop]}>
            {/* Task Creation & Editing Panel */}
            {(isDesktop || isFormVisible) && (
              <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
                <View style={styles.panelHeader}>
                  <View style={styles.panelTitleRow}>
                    <Feather
                      name={editingTaskId ? 'edit-3' : 'plus-circle'}
                      size={18}
                      color="#38BDF8"
                    />
                    <Text style={styles.panelTitle}>
                      {editingTaskId ? 'Edit Task' : 'Create New Task'}
                    </Text>
                  </View>
                  {editingTaskId && (
                    <Pressable onPress={resetForm} style={styles.cancelLink}>
                      <Text style={styles.cancelLinkText}>Cancel Edit</Text>
                    </Pressable>
                  )}
                </View>

                {/* Validation Message */}
                {validationError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="warning-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{validationError}</Text>
                  </View>
                )}

                {/* Input: Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Task Title <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      validationError && !title.trim() && styles.inputErrorBorder,
                    ]}
                    placeholder="e.g. Redesign Landing Page"
                    placeholderTextColor="#64748B"
                    value={title}
                    onChangeText={(val) => {
                      setTitle(val);
                      if (validationError && val.trim()) {
                        setValidationError(null);
                      }
                    }}
                  />
                </View>

                {/* Input: Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter detailed description or sub-tasks..."
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* Input: Priority Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Priority Level</Text>
                  <View style={styles.chipRow}>
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                      const isSelected = priority === p;
                      const color =
                        p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#10B981';
                      return (
                        <Pressable
                          key={p}
                          style={[
                            styles.chipButton,
                            isSelected && {
                              borderColor: color,
                              backgroundColor: `${color}20`,
                            },
                          ]}
                          onPress={() => setPriority(p)}
                        >
                          <View
                            style={[
                              styles.priorityDot,
                              { backgroundColor: color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: '#F8FAFC', fontWeight: '700' },
                            ]}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Input: Status Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Initial Status</Text>
                  <View style={styles.chipRow}>
                    {(['pending', 'in_progress', 'completed'] as Status[]).map((s) => {
                      const isSelected = status === s;
                      const label =
                        s === 'in_progress'
                          ? 'In Progress'
                          : s.charAt(0).toUpperCase() + s.slice(1);
                      return (
                        <Pressable
                          key={s}
                          style={[
                            styles.chipButton,
                            isSelected && styles.statusChipSelected,
                          ]}
                          onPress={() => setStatus(s)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.statusChipTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Input: Due Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD (e.g. 2026-10-25)"
                    placeholderTextColor="#64748B"
                    value={dueDate}
                    onChangeText={setDueDate}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.formActions}>
                  {editingTaskId && (
                    <Pressable
                      style={styles.cancelButton}
                      onPress={resetForm}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.primaryButton, editingTaskId ? styles.updateButton : null]}
                    onPress={handleSubmitTask}
                  >
                    <Ionicons
                      name={editingTaskId ? 'save-outline' : 'add-circle-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryButtonText}>
                      {editingTaskId ? 'Save Changes' : 'Add Task'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Task List Panel */}
            <View style={[styles.listPanel, isDesktop && styles.listPanelDesktop]}>
              {/* Search and Filters Bar */}
              <View style={styles.searchFilterCard}>
                {/* Search Input */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tasks by title or description..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </Pressable>
                  )}
                </View>

                {/* Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterPillsRow}
                >
                  <Text style={styles.filterHeading}>Status:</Text>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                  ].map((filter) => (
                    <Pressable
                      key={filter.key}
                      style={[
                        styles.filterPill,
                        statusFilter === filter.key && styles.filterPillActive,
                      ]}
                      onPress={() => setStatusFilter(filter.key)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          statusFilter === filter.key && styles.filterPillTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}

                  <View style={styles.filterDivider} />

                  <Text style={styles.filterHeading}>Priority:</Text>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'high', label: 'High' },
                    { key: 'medium', label: 'Medium' },
                    { key: 'low', label: 'Low' },
                  ].map((p) => (
                    <Pressable
                      key={p.key}
                      style={[
                        styles.filterPill,
                        priorityFilter === p.key && styles.filterPillActive,
                      ]}
                      onPress={() => setPriorityFilter(p.key)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          priorityFilter === p.key && styles.filterPillTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Task Count Header */}
              <View style={styles.taskListHeader}>
                <Text style={styles.taskListTitle}>
                  Task List{' '}
                  <Text style={styles.taskListCount}>
                    ({filteredTasks.length}{' '}
                    {filteredTasks.length === 1 ? 'task' : 'tasks'})
                  </Text>
                </Text>
                {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
                  <Pressable
                    onPress={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      priorityFilter !== 'all' && setPriorityFilter('all');
                    }}
                    style={styles.resetFiltersBtn}
                  >
                    <Text style={styles.resetFiltersText}>Reset Filters</Text>
                  </Pressable>
                )}
              </View>

              {/* Empty State */}
              {filteredTasks.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="clipboard-outline" size={48} color="#64748B" />
                  </View>
                  <Text style={styles.emptyStateTitle}>No Tasks Found</Text>
                  <Text style={styles.emptyStateDescription}>
                    {tasks.length === 0
                      ? 'You do not have any tasks yet. Create your first task using the form to get started!'
                      : 'No tasks match your current search and filter criteria.'}
                  </Text>
                  {tasks.length === 0 && (
                    <Pressable
                      style={styles.emptyStateButton}
                      onPress={() => {
                        resetForm();
                        setIsFormVisible(true);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text style={styles.emptyStateButtonText}>Create a Task</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                /* Task Cards List */
                <View style={styles.taskCardsContainer}>
                  {filteredTasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const isInProgress = task.status === 'in_progress';

                    // Priority color mapping
                    const priorityColor =
                      task.priority === 'high'
                        ? '#EF4444'
                        : task.priority === 'medium'
                          ? '#F59E0B'
                          : '#10B981';

                    // Status badge style
                    const statusBg =
                      isCompleted
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isInProgress
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(168, 85, 247, 0.15)';
                    const statusTextColor =
                      isCompleted ? '#10B981' : isInProgress ? '#F59E0B' : '#A855F7';
                    const statusLabel =
                      isCompleted
                        ? 'Completed'
                        : isInProgress
                          ? 'In Progress'
                          : 'Pending';

                    return (
                      <View
                        key={task.id}
                        style={[
                          styles.taskCard,
                          isCompleted && styles.taskCardCompleted,
                        ]}
                      >
                        {/* Left Checkbox / Completion Toggle */}
                        <Pressable
                          style={styles.checkboxTouch}
                          onPress={() => handleToggleComplete(task.id)}
                          accessibilityLabel={
                            isCompleted ? 'Mark as pending' : 'Mark as completed'
                          }
                        >
                          <View
                            style={[
                              styles.checkbox,
                              isCompleted && styles.checkboxChecked,
                            ]}
                          >
                            {isCompleted && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </Pressable>

                        {/* Task Information */}
                        <View style={styles.taskInfo}>
                          <View style={styles.taskTitleRow}>
                            <Text
                              style={[
                                styles.taskTitleText,
                                isCompleted && styles.taskTitleTextCompleted,
                              ]}
                            >
                              {task.title}
                            </Text>
                          </View>

                          {task.description ? (
                            <Text
                              style={[
                                styles.taskDescText,
                                isCompleted && styles.taskDescTextCompleted,
                              ]}
                            >
                              {task.description}
                            </Text>
                          ) : null}

                          {/* Badges Row: Priority, Status, Due Date */}
                          <View style={styles.badgesRow}>
                            {/* Priority Badge */}
                            <View
                              style={[
                                styles.badge,
                                {
                                  backgroundColor: `${priorityColor}1A`,
                                  borderColor: `${priorityColor}40`,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.priorityDotSmall,
                                  { backgroundColor: priorityColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: priorityColor },
                                ]}
                              >
                                {task.priority.toUpperCase()}
                              </Text>
                            </View>

                            {/* Status Cycle Button / Badge */}
                            <Pressable
                              style={[
                                styles.badge,
                                {
                                  backgroundColor: statusBg,
                                  borderColor: `${statusTextColor}40`,
                                },
                              ]}
                              onPress={() => handleCycleStatus(task.id)}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: statusTextColor },
                                ]}
                              >
                                {statusLabel} ↻
                              </Text>
                            </Pressable>

                            {/* Due Date Badge */}
                            <View style={styles.dateBadge}>
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color="#94A3B8"
                              />
                              <Text style={styles.dateText}>
                                {task.dueDate || 'No due date'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Action Buttons: Edit & Delete */}
                        <View style={styles.taskActions}>
                          <Pressable
                            style={styles.actionIconButton}
                            onPress={() => handleStartEdit(task)}
                            accessibilityLabel="Edit task"
                          >
                            <Feather name="edit-2" size={16} color="#94A3B8" />
                          </Pressable>
                          <Pressable
                            style={[styles.actionIconButton, styles.deleteIconButton]}
                            onPress={() => setTaskToDelete(task)}
                            accessibilityLabel="Delete task"
                          >
                            <Feather name="trash-2" size={16} color="#EF4444" />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!taskToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-triangle" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Task</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to delete{' '}
              <Text style={styles.modalHighlight}>"{taskToDelete?.title}"</Text>? This action
              cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setTaskToDelete(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalDeleteButton}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: 600,
  },
  mainWrapperDesktop: {
    maxWidth: 1200,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexWrap: 'wrap',
    gap: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  headerButtonActive: {
    backgroundColor: '#334155',
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#64748B',
  },

  // Content Layout
  contentLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  contentLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },

  // Form Panel
  formPanel: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  formPanelDesktop: {
    width: 380,
    position: 'sticky' as any,
    top: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cancelLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  cancelLinkText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F8FAFC',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statusChipSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusChipTextSelected: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  updateButton: {
    backgroundColor: '#10B981',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },

  // List Panel
  listPanel: {
    flex: 1,
  },
  listPanelDesktop: {
    flex: 1,
  },

  // Search & Filter Card
  searchFilterCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F8FAFC',
  },
  clearSearch: {
    padding: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterPillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },

  // Task List Header
  taskListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  taskListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  taskListCount: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  resetFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetFiltersText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },

  // Empty State
  emptyStateContainer: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Task Cards
  taskCardsContainer: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskCardCompleted: {
    backgroundColor: '#0B1321',
    borderColor: '#1E293B',
    opacity: 0.85,
  },
  checkboxTouch: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskInfo: {
    flex: 1,
    gap: 6,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 20,
  },
  taskTitleTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDescText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  taskDescTextCompleted: {
    color: '#475569',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // Task Actions
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalHighlight: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 14,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
