<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { exercisesAPI, lessonsAPI, unitsAPI, courseAPI } from '@/utils/api.js'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const showModal = ref(false)
const isEditMode = ref(false)

// Data
const exercises = ref([])
const courses = ref([])
const units = ref([])
const lessons = ref([])
const selectedCourse = ref('')
const selectedUnit = ref('')
const selectedLesson = ref('')
const showQuestionModal = ref(false)
const isEditingQuestion = ref(false)
const currentQuestionIndex = ref(-1)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = computed(() => Math.ceil(filteredExercises.value.length / itemsPerPage.value))

// Form data
const form = reactive({
  id: null,
  title: '',
  exercise_type: 'grammar',
  audio_url: '',
  image_url: '',
  instructions: '',
  content: '',
  isActive: true,
  courseId: '',
  unitId: '',
  lessonId: '',
  questions: []
})

// Current question being edited
const currentQuestion = reactive({
  id: null,
  question_type: 'multiple_choice',
  question_text: '',
  points: 1,
  order_number: 1,
  sample_answer: '',
  choices: [
    {
      option_text: '',
      is_correct: false
    },
    {
      option_text: '',
      is_correct: false
    }
  ],
  gap_filling: [
    {
      gap_number: 1,
      correct_answer: []
    }
  ],
  matching_pairs: [
    {
      left_item: '',
      right_item: ''
    }
  ],
  typing_exercise: [
    {
      correct_answer: '',
      is_case_sensitive: false
    }
  ],
  sentence_build: [
    {
      given_text: '',
      correct_answer: ''
    }
  ]
})

// Exercise types
const exerciseTypes = [
  { value: 'grammar', label: 'Grammar', icon: 'fa-book' },
  { value: 'listening', label: 'Listening', icon: 'fa-headphones' },
  { value: 'reading', label: 'Reading', icon: 'fa-book-open' },
  { value: 'writing', label: 'Writing', icon: 'fa-pen' }
]

// Question types
const questionTypes = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'fa-check-circle' },
  { value: 'true_false', label: 'True/False', icon: 'fa-check-square' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', icon: 'fa-pen' },
  { value: 'matching', label: 'Matching Pairs', icon: 'fa-link' },
  { value: 'short_answer', label: 'Short Answer', icon: 'fa-keyboard' }
]

// Computed properties
const filteredExercises = computed(() => {
  let result = exercises.value

  if (selectedCourse.value) {
    // Filter by course through lesson relationship
    const courseLessons = lessons.value.filter(lesson => {
      const unit = units.value.find(u => u.id === lesson.moduleId)
      return unit && unit.courseId === selectedCourse.value
    })
    const courseLessonIds = courseLessons.map(lesson => lesson.id)
    result = result.filter(exercise => courseLessonIds.includes(exercise.lessonId))
  }

  if (selectedUnit.value) {
    // Filter by unit through lesson relationship
    const unitLessons = lessons.value.filter(lesson => lesson.moduleId === selectedUnit.value)
    const unitLessonIds = unitLessons.map(lesson => lesson.id)
    result = result.filter(exercise => unitLessonIds.includes(exercise.lessonId))
  }

  if (selectedLesson.value) {
    result = result.filter(exercise => exercise.lessonId === selectedLesson.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(exercise =>
      exercise.title.toLowerCase().includes(query) ||
      (exercise.instructions && exercise.instructions.toLowerCase().includes(query))
    )
  }

  return result
})

const paginatedExercises = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredExercises.value.slice(start, end)
})

const availableUnits = computed(() => {
  if (!selectedCourse.value) return []
  return units.value.filter(unit => unit.courseId === selectedCourse.value)
})

const availableLessons = computed(() => {
  if (!selectedUnit.value) return []
  return lessons.value.filter(lesson => lesson.moduleId === selectedUnit.value)
})

// Modal-specific computed properties for filtering
const modalAvailableUnits = computed(() => {
  if (!form.courseId) return []
  return units.value.filter(unit => unit.courseId === form.courseId)
})

const modalAvailableLessons = computed(() => {
  if (!form.unitId) return []
  return lessons.value.filter(lesson => lesson.moduleId === form.unitId)
})

// Dynamic form visibility
const showAudioField = computed(() => {
  return form.exercise_type !== 'writing'
})

const showImagePreview = computed(() => {
  return form.image_url && form.image_url.trim() !== ''
})

const useRichEditor = computed(() => {
  return form.exercise_type === 'reading' || form.exercise_type === 'writing'
})

// Question-specific computed properties
const showQuestionOptions = computed(() => {
  return currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false'
})

const showGapFilling = computed(() => {
  return currentQuestion.question_type === 'fill_in_the_blank'
})

const showMatching = computed(() => {
  return currentQuestion.question_type === 'matching'
})

const showTyping = computed(() => {
  return currentQuestion.question_type === 'short_answer'
})

// Functions
const fetchExercises = async () => {
  isLoading.value = true
  try {
    const response = await exercisesAPI.getAll()
    const exercisesData = response.data || response
    exercises.value = Array.isArray(exercisesData) ? exercisesData : []
    currentPage.value = 1 // Reset to first page when loading new data
  } catch (err) {
    error.value = `Failed to fetch exercises: ${err.message || 'Unknown error'}`
    console.error('Error fetching exercises:', err)
    exercises.value = []
  } finally {
    isLoading.value = false
  }
}

// Pagination functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const getPageNumbers = () => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show ellipsis pagination
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }

  return pages
}

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    const coursesData = response.data || response
    courses.value = Array.isArray(coursesData) ? coursesData : []
  } catch (err) {
    console.error('Error fetching courses:', err)
    courses.value = []
  }
}

const fetchUnits = async () => {
  try {
    const response = await unitsAPI.getAll()
    const unitsData = response.data || response
    units.value = Array.isArray(unitsData) ? unitsData : []
  } catch (err) {
    console.error('Error fetching units:', err)
    units.value = []
  }
}

const fetchLessons = async () => {
  try {
    const response = await lessonsAPI.getAll()
    const lessonsData = response.data || response
    lessons.value = Array.isArray(lessonsData) ? lessonsData : []
  } catch (err) {
    console.error('Error fetching lessons:', err)
    lessons.value = []
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (exercise) => {
  isEditMode.value = true
  form.id = exercise.id
  form.title = exercise.title
  form.exercise_type = exercise.exercise_type || 'grammar'
  form.audio_url = exercise.audio_url || ''
  form.image_url = exercise.image_url || ''
  form.instructions = exercise.instructions || ''
  form.content = exercise.content || ''
  form.isActive = exercise.isActive
  form.lessonId = exercise.lessonId

  // Populate course and unit based on the selected lesson
  if (exercise.lessonId) {
    const lesson = lessons.value.find(l => l.id === exercise.lessonId)
    if (lesson) {
      form.unitId = lesson.moduleId
      const unit = units.value.find(u => u.id === lesson.moduleId)
      if (unit) {
        form.courseId = unit.courseId
      }
    }
  }

  // Handle questions array and parse gap filling correct_answer strings to arrays
  if (exercise.questions && Array.isArray(exercise.questions)) {
    form.questions = exercise.questions.map(question => {
      const questionCopy = { ...question }

      // Parse gap_filling correct_answer strings to arrays
      if (questionCopy.gap_filling && Array.isArray(questionCopy.gap_filling)) {
        questionCopy.gap_filling = questionCopy.gap_filling.map(gap => {
          const gapCopy = { ...gap }
          if (typeof gapCopy.correct_answer === 'string') {
            try {
              gapCopy.correct_answer = JSON.parse(gapCopy.correct_answer)
            } catch (e) {
              // If parsing fails, wrap the string in an array
              gapCopy.correct_answer = [gapCopy.correct_answer]
            }
          }
          // Ensure it's always an array
          if (!Array.isArray(gapCopy.correct_answer)) {
            gapCopy.correct_answer = [gapCopy.correct_answer]
          }
          return gapCopy
        })
      }
      // Handle sentence_build as array
      if (questionCopy.sentence_build && Array.isArray(questionCopy.sentence_build)) {
        questionCopy.sentence_build = questionCopy.sentence_build.length > 0
          ? questionCopy.sentence_build[0]
          : { given_text: '', correct_answer: '' }
      }


      return questionCopy
    })
  } else {
    form.questions = []
  }

  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.title = ''
  form.exercise_type = 'grammar'
  form.audio_url = ''
  form.image_url = ''
  form.instructions = ''
  form.content = ''
  form.isActive = true
  form.courseId = ''
  form.unitId = ''
  form.lessonId = ''
  form.questions = []
}

// Question management functions
const resetCurrentQuestion = () => {
  currentQuestion.id = null
  currentQuestion.question_type = 'multiple_choice'
  currentQuestion.question_text = ''
  currentQuestion.points = 1
  currentQuestion.order_number = 1
  currentQuestion.sample_answer = ''
  currentQuestion.choices = [
    {
      option_text: '',
      is_correct: false
    },
    {
      option_text: '',
      is_correct: false
    }
  ]
  currentQuestion.gap_filling = [
    {
      gap_number: 1,
      correct_answer: []
    }
  ]
  currentQuestion.matching_pairs = [
    {
      left_item: '',
      right_item: ''
    }
  ]
  currentQuestion.typing_exercise = [
    {
      correct_answer: '',
      is_case_sensitive: false
    }
  ]
  currentQuestion.sentence_build = [
    {
    given_text: '',
    correct_answer: ''
    }
  ]
}

const openQuestionModal = (questionIndex = -1) => {
  if (questionIndex >= 0) {
    isEditingQuestion.value = true
    currentQuestionIndex.value = questionIndex
    const question = form.questions[questionIndex]

    // Deep copy the question
    const questionCopy = { ...question }

    // Parse gap_filling correct_answer strings to arrays if needed
    if (questionCopy.gap_filling && Array.isArray(questionCopy.gap_filling)) {
      questionCopy.gap_filling = questionCopy.gap_filling.map(gap => {
        const gapCopy = { ...gap }
        if (typeof gapCopy.correct_answer === 'string') {
          try {
            gapCopy.correct_answer = JSON.parse(gapCopy.correct_answer)
          } catch (e) {
            // If parsing fails, wrap the string in an array
            gapCopy.correct_answer = [gapCopy.correct_answer]
          }
        }
        // Ensure it's always an array
        if (!Array.isArray(gapCopy.correct_answer)) {
          gapCopy.correct_answer = [gapCopy.correct_answer]
        }
        return gapCopy
      })
    }

    // Handle sentence_build as array
    if (questionCopy.sentence_build) {
      if (!Array.isArray(questionCopy.sentence_build)) {
        // Convert old format to new array format if needed
        questionCopy.sentence_build = [questionCopy.sentence_build]
      }
    } else {
      questionCopy.sentence_build = [{ given_text: '', correct_answer: '' }]
    }

    Object.assign(currentQuestion, questionCopy)
  } else {
    isEditingQuestion.value = false
    currentQuestionIndex.value = -1
    resetCurrentQuestion()
    currentQuestion.order_number = form.questions.length + 1
  }
  showQuestionModal.value = true
}

const closeQuestionModal = () => {
  showQuestionModal.value = false
  resetCurrentQuestion()
}

const saveQuestion = () => {
  if (!currentQuestion.question_text.trim()) {
    error.value = 'Please enter question text'
    return
  }

  const questionData = {
    question_type: currentQuestion.question_type,
    question_text: currentQuestion.question_text,
    points: currentQuestion.points,
    order_number: currentQuestion.order_number,
    sample_answer: currentQuestion.sample_answer,
    choices: [],
    gap_filling: [],
    matching_pairs: [],
    typing_exercise: []
  }

  // Add type-specific data
  if (showQuestionOptions.value) {
    questionData.choices = currentQuestion.choices.filter(opt => opt.option_text.trim())
  } else if (showGapFilling.value) {
    questionData.gap_filling = currentQuestion.gap_filling
  } else if (showMatching.value) {
    questionData.matching_pairs = currentQuestion.matching_pairs.filter(pair => pair.left_item.trim() && pair.right_item.trim())
  } else if (showTyping.value) {
    // Ensure typing_exercise is always an array with valid objects
    questionData.typing_exercise = (currentQuestion.typing_exercise || []).map(te => ({
      correct_answer: te.correct_answer ?? '',
      is_case_sensitive: te.is_case_sensitive ?? false
    }))
    // If empty, add a default
    if (questionData.typing_exercise.length === 0) {
      questionData.typing_exercise = [{ correct_answer: '', is_case_sensitive: false }]
    }
  }

  if (isEditingQuestion.value) {
    form.questions[currentQuestionIndex.value] = { ...questionData, id: currentQuestion.id }
  } else {
    form.questions.push(questionData)
  }

  closeQuestionModal()
}

const deleteQuestion = (index) => {
  if (confirm('Are you sure you want to delete this question?')) {
    form.questions.splice(index, 1)
    // Update order numbers
    form.questions.forEach((q, i) => {
      q.order_number = i + 1
    })
  }
}

const saveExercise = async () => {
  if (!form.title || !form.lessonId) {
    error.value = 'Please fill in all required fields'
    return
  }

  isLoading.value = true
  try {
    // Prepare the data to send
    const exerciseData = {
      title: form.title,
      exercise_type: form.exercise_type,
      audio_url: form.audio_url || null,
      image_url: form.image_url || null,
      instructions: form.instructions,
      content: form.content,
      isActive: form.isActive,
      lessonId: form.lessonId,
      questions: form.questions
    }

    if (isEditMode.value) {
      const response = await exercisesAPI.update(form.id, exerciseData)
      const index = exercises.value.findIndex(exercise => exercise.id === form.id)
      if (index !== -1) {
        exercises.value[index] = {
          ...exercises.value[index],
          ...(response.data || response || exerciseData),
          id: form.id
        }
      }
    } else {
      const response = await exercisesAPI.create(exerciseData)
      // Ensure we have a proper exercise object with all needed data
      const newExercise = {
        ...exerciseData,
        id: (response.data && response.data.id) || response.id || Date.now(),
        createdAt: (response.data && response.data.createdAt) || response.createdAt || new Date().toISOString().split('T')[0],
        updatedAt: (response.data && response.data.updatedAt) || response.updatedAt || new Date().toISOString().split('T')[0],
        ...(response.data || response) // Spread any additional fields from the response
      }
      // Add to beginning of array to show newest first
      exercises.value.unshift(newExercise)
      // Reset page to first to show the new exercise
      currentPage.value = 1
    }
    closeModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save exercise: ${err.message || 'Unknown error'}`
    console.error('Error saving exercise:', err)
  } finally {
    isLoading.value = false
  }
}

const deleteExercise = async (id) => {
  if (!confirm('Are you sure you want to delete this exercise?')) return

  isLoading.value = true
  try {
    await exercisesAPI.delete(id)
    exercises.value = exercises.value.filter(exercise => exercise.id !== id)
    error.value = ''
  } catch (err) {
    error.value = `Failed to delete exercise: ${err.message || 'Unknown error'}`
    console.error('Error deleting exercise:', err)
  } finally {
    isLoading.value = false
  }
}

const toggleExerciseStatus = async (exercise) => {
  const originalStatus = exercise.isActive
  try {
    exercise.isActive = !exercise.isActive
    const updatedExercise = {
      ...exercise,
      isActive: exercise.isActive
    }
    await exercisesAPI.update(exercise.id, updatedExercise)
    error.value = ''
  } catch (err) {
    exercise.isActive = originalStatus
    error.value = `Failed to update exercise status: ${err.message || 'Unknown error'}`
    console.error('Error updating exercise status:', err)
  }
}

// Helper functions for managing question options
const addOption = () => {
  currentQuestion.choices.push({
    option_text: '',
    is_correct: false
  })
}

const removeOption = (index) => {
  if (currentQuestion.choices.length > 2) {
    currentQuestion.choices.splice(index, 1)
  }
}

// Helper functions for gap filling
const addGapAnswer = () => {
  currentQuestion.gap_filling.push({
    gap_number: currentQuestion.gap_filling.length + 1,
    correct_answer: []
  })
}

const removeGapAnswer = (index) => {
  if (currentQuestion.gap_filling.length > 1) {
    currentQuestion.gap_filling.splice(index, 1)
    // Update gap numbers
    currentQuestion.gap_filling.forEach((gap, i) => {
      gap.gap_number = i + 1
    })
  }
}

const addAnswerToGap = (gapIndex) => {
  if (!currentQuestion.gap_filling[gapIndex].correct_answer) {
    currentQuestion.gap_filling[gapIndex].correct_answer = []
  }
  currentQuestion.gap_filling[gapIndex].correct_answer.push('')
}

const removeAnswerFromGap = (gapIndex, answerIndex) => {
  if (currentQuestion.gap_filling[gapIndex].correct_answer.length > 1) {
    currentQuestion.gap_filling[gapIndex].correct_answer.splice(answerIndex, 1)
  }
}

// Helper functions for matching pairs
const addMatchingPair = () => {
  currentQuestion.matching_pairs.push({
    left_item: '',
    right_item: ''
  })
}

const removeMatchingPair = (index) => {
  if (currentQuestion.matching_pairs.length > 1) {
    currentQuestion.matching_pairs.splice(index, 1)
  }
}

// Helper functions for label display
const getExerciseTypeLabel = (type) => {
  const exerciseType = exerciseTypes.find(t => t.value === type)
  return exerciseType ? exerciseType.label : type
}

const getQuestionTypeLabel = (type) => {
  const questionType = questionTypes.find(t => t.value === type)
  return questionType ? questionType.label : type
}

const getLessonNameById = (lessonId) => {
  const lesson = lessons.value.find(l => l.id === lessonId)
  return lesson ? lesson.title : 'Unknown Lesson'
}

const getTotalPoints = (exercise) => {
  if (!exercise.questions || !Array.isArray(exercise.questions)) return 0
  return exercise.questions.reduce((total, question) => total + (question.points || 0), 0)
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchExercises(),
    fetchCourses(),
    fetchUnits(),
    fetchLessons()
  ])
})

// Watchers
watch([searchQuery, selectedCourse, selectedUnit, selectedLesson], () => {
  currentPage.value = 1 // Reset to first page when filters change
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Exercises Management</h1>
          <p class="text-gray-600">Manage your course exercises and assessments</p>
        </div>
        <button @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <i class="fas fa-plus mr-2"></i>
          Add Exercise
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Exercises</label>
          <input type="text" v-model="searchQuery" placeholder="Search by title or description..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <!-- Course Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Course</label>
          <select v-model="selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Courses</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </select>
        </div>

        <!-- Unit Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Unit</label>
          <select v-model="selectedUnit" :disabled="!selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
            <option value="">All Units</option>
            <option v-for="unit in availableUnits" :key="unit.id" :value="unit.id">
              {{ unit.title }}
            </option>
          </select>
        </div>

        <!-- Lesson Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Lesson</label>
          <select v-model="selectedLesson" :disabled="!selectedUnit"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
            <option value="">All Lessons</option>
            <option v-for="lesson in availableLessons" :key="lesson.id" :value="lesson.id">
              {{ lesson.title }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Exercises Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exercise
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lesson
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="isLoading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Loading exercises...
              </td>
            </tr>
            <tr v-else-if="filteredExercises.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                No exercises found
              </td>
            </tr>
            <tr v-else v-for="exercise in paginatedExercises" :key="exercise.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ exercise.title }}</div>
                  <div class="text-sm text-gray-500" v-if="exercise.instructions">{{ exercise.instructions }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="space-y-1">
                  <div class="flex items-center">
                    <i class="fas fa-tag text-blue-500 mr-2"></i>
                    <span class="text-sm text-gray-900">{{ getExerciseTypeLabel(exercise.exercise_type) }}</span>
                  </div>
                  <div class="flex items-center">
                    <i class="fas fa-question-circle text-green-500 mr-2"></i>
                    <span class="text-xs text-gray-600">{{ exercise.questions ? exercise.questions.length : 0 }}
                      Questions</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getLessonNameById(exercise.lessonId) }}</div>
                <div class="text-xs text-gray-400">Lesson</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">{{ getTotalPoints(exercise) }}pts</span>
                  <span v-if="exercise.audio_url" class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                    <i class="fas fa-volume-up mr-1"></i>Audio
                  </span>
                  <span v-if="exercise.image_url" class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    <i class="fas fa-image mr-1"></i>Image
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button @click="toggleExerciseStatus(exercise)"
                  :class="exercise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ exercise.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="openEditModal(exercise)" class="text-indigo-600 hover:text-indigo-900 mr-3">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="deleteExercise(exercise.id)" class="text-red-600 hover:text-red-900">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="flex justify-center items-center py-6">
      <button @click="previousPage" :disabled="currentPage === 1"
        class="px-3 py-1 mx-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50">
        <i class="fas fa-chevron-left"></i>
      </button>
      <template v-for="page in getPageNumbers()" :key="page">
        <span v-if="page === '...'" class="px-2 text-gray-400">...</span>
        <button v-else @click="goToPage(page)" :class="[
          'px-3 py-1 mx-1 rounded border',
          currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
        ]">
          {{ page }}
        </button>
      </template>
      <button @click="nextPage" :disabled="currentPage === totalPages"
        class="px-3 py-1 mx-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditMode ? 'Edit Exercise' : 'Create New Exercise' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="saveExercise" class="space-y-4">
            <!-- Basic Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Title <span class="text-red-500">*</span>
                </label>
                <input type="text" v-model="form.title" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter exercise title">
              </div>

              <!-- Exercise Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Exercise Type</label>
                <select v-model="form.exercise_type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="type in exerciseTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Media URLs -->
            <div v-if="!showImagePreview" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-if="showAudioField">
                <label class="block text-sm font-medium text-gray-700 mb-1">Audio URL</label>
                <input type="url" v-model="form.audio_url"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter audio URL">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" v-model="form.image_url"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter image URL">
              </div>
            </div>

            <!-- Image Preview -->
            <div v-if="showImagePreview" class="space-y-4">
              <div class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-2">Exercise Image</label>
                <div class="relative inline-block">
                  <img :src="form.image_url" alt="Exercise image"
                    class="max-w-sm max-h-64 rounded-lg border border-gray-300 object-cover"
                    @error="form.image_url = ''">
                  <button type="button" @click="form.image_url = ''"
                    class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs">
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Instructions -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea v-model="form.instructions" rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter instructions for students"></textarea>
            </div>

            <!-- Content -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <QuillEditor v-if="useRichEditor" v-model:content="form.content" contentType="html" theme="snow" toolbar="full"
                class="bg-white" placeholder="Enter main content/text for the exercise" />
              <textarea v-else v-model="form.content" rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter main content/text for the exercise"></textarea>
            </div>

            <!-- Course, Unit and Lesson Selection -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Course Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select v-model="form.courseId" @change="form.unitId = ''; form.lessonId = ''"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Course</option>
                  <option v-for="course in courses" :key="course.id" :value="course.id">
                    {{ course.title }}
                  </option>
                </select>
              </div>

              <!-- Unit Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select v-model="form.unitId" @change="form.lessonId = ''" :disabled="!form.courseId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Unit</option>
                  <option v-for="unit in modalAvailableUnits" :key="unit.id" :value="unit.id">
                    {{ unit.title }}
                  </option>
                </select>
              </div>

              <!-- Lesson Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Lesson <span class="text-red-500">*</span>
                </label>
                <select v-model="form.lessonId" :disabled="!form.unitId" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                  <option value="">Select Lesson</option>
                  <option v-for="lesson in modalAvailableLessons" :key="lesson.id" :value="lesson.id">
                    {{ lesson.title }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Questions Management -->
            <div v-if="form.exercise_type !== 'writing'" class="space-y-4">
              <div class="flex justify-between items-center">
                <h4 class="text-md font-medium text-gray-900">Questions</h4>
                <button type="button" @click="openQuestionModal()"
                  class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm">
                  <i class="fas fa-plus mr-1"></i>Add Question
                </button>
              </div>

              <div v-if="form.questions.length === 0"
                class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <i class="fas fa-question-circle text-gray-400 text-3xl mb-2"></i>
                <p class="text-gray-500">No questions added yet. Click "Add Question" to start.</p>
              </div>

              <div v-else class="space-y-3">
                <div v-for="(question, index) in form.questions" :key="index" class="border rounded-lg p-4 bg-gray-50">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-2">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {{ getQuestionTypeLabel(question.question_type) }}
                        </span>
                        <span class="text-xs text-gray-500">{{ question.points || 0 }} points</span>
                        <span class="text-xs text-gray-500">Order: {{ question.order_number }}</span>
                      </div>
                      <p class="text-sm text-gray-900 font-medium">{{ question.question_text || 'No question text' }}
                      </p>
                    </div>
                    <div class="flex space-x-2">
                      <button type="button" @click="openQuestionModal(index)"
                        class="text-blue-600 hover:text-blue-700 text-sm">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button type="button" @click="deleteQuestion(index)"
                        class="text-red-600 hover:text-red-700 text-sm">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center">
              <input type="checkbox" v-model="form.isActive" id="isActive"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              <label for="isActive" class="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="closeModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
                {{ isEditMode ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Question Modal -->
    <div v-if="showQuestionModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Question Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditingQuestion ? 'Edit Question' : 'Add New Question' }}
            </h3>
            <button @click="closeQuestionModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Question Modal Body -->
          <form @submit.prevent="saveQuestion" class="space-y-4">
            <!-- Question Type and Points -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select v-model="currentQuestion.question_type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option v-for="type in questionTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input type="number" v-model="currentQuestion.points" min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input type="number" v-model="currentQuestion.order_number" min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <!-- Question Text -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Question Text <span class="text-red-500">*</span>
              </label>
              <textarea v-model="currentQuestion.question_text" rows="2" required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the question text"></textarea>
            </div>

            <!-- Sample Answer -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sample Answer (Optional)</label>
              <input type="text" v-model="currentQuestion.sample_answer"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a sample answer or explanation">
            </div>

            <!-- Type-specific fields -->
            <!-- Multiple Choice / True False Options -->
            <div v-if="showQuestionOptions" class="space-y-3">
              <h5 class="text-md font-medium text-gray-900">Answer Options</h5>

              <div class="space-y-2">
                <div v-for="(option, index) in currentQuestion.choices" :key="index"
                  class="flex items-center space-x-2">
                  <input type="text" v-model="option.option_text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="`Option ${index + 1}`">
                  <label class="flex items-center">
                    <input type="checkbox" v-model="option.is_correct"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <span class="ml-1 text-sm text-gray-700">Correct</span>
                  </label>
                  <button type="button" @click="removeOption(index)" :disabled="currentQuestion.choices.length <= 2"
                    class="text-red-600 hover:text-red-700 disabled:text-gray-400">
                    <i class="fas fa-times"></i>
                  </button>
                </div>

                <button v-if="currentQuestion.question_type === 'multiple_choice'" type="button" @click="addOption"
                  class="w-full px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600">
                  <i class="fas fa-plus mr-2"></i>Add Option
                </button>
              </div>
            </div>

            <!-- Fill in the Blank / Gap Filling -->
            <div v-if="showGapFilling" class="space-y-3">
              <h5 class="text-md font-medium text-gray-900">Gap Answers</h5>
              <p class="text-sm text-gray-600">Define the correct answers for each gap in your question text.</p>

              <div class="space-y-4">
                <div v-for="(gap, gapIndex) in currentQuestion.gap_filling" :key="gapIndex"
                  class="border rounded-lg p-4 bg-gray-50">
                  <div class="flex items-center justify-between mb-3">
                    <h6 class="text-sm font-medium text-gray-700">Gap {{ gap.gap_number }}</h6>
                    <button type="button" @click="removeGapAnswer(gapIndex)"
                      :disabled="currentQuestion.gap_filling.length <= 1"
                      class="text-red-600 hover:text-red-700 disabled:text-gray-400 text-sm">
                      <i class="fas fa-times mr-1"></i>Remove Gap
                    </button>
                  </div>

                  <div class="space-y-2">
                    <div v-for="(answer, answerIndex) in gap.correct_answer" :key="answerIndex"
                      class="flex items-center space-x-2">
                      <input type="text" v-model="gap.correct_answer[answerIndex]"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :placeholder="`Correct answer ${answerIndex + 1}`">
                      <button type="button" @click="removeAnswerFromGap(gapIndex, answerIndex)"
                        :disabled="gap.correct_answer.length <= 1"
                        class="text-red-600 hover:text-red-700 disabled:text-gray-400">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>

                    <button type="button" @click="addAnswerToGap(gapIndex)"
                      class="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 text-sm">
                      <i class="fas fa-plus mr-2"></i>Add Alternative Answer
                    </button>
                  </div>
                </div>

                <button type="button" @click="addGapAnswer"
                  class="w-full px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600">
                  <i class="fas fa-plus mr-2"></i>Add Gap
                </button>
              </div>
            </div>

            <!-- Matching Pairs -->
            <div v-if="showMatching" class="space-y-3">
              <h5 class="text-md font-medium text-gray-900">Matching Pairs</h5>

              <div class="space-y-2">
                <div v-for="(pair, index) in currentQuestion.matching_pairs" :key="index"
                  class="grid grid-cols-2 gap-2">
                  <input type="text" v-model="pair.left_item"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Left item">
                  <div class="flex items-center space-x-2">
                    <input type="text" v-model="pair.right_item"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Right item">
                    <button type="button" @click="removeMatchingPair(index)"
                      :disabled="currentQuestion.matching_pairs.length <= 1"
                      class="text-red-600 hover:text-red-700 disabled:text-gray-400">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <button type="button" @click="addMatchingPair"
                  class="w-full px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600">
                  <i class="fas fa-plus mr-2"></i>Add Pair
                </button>
              </div>
            </div>

            <!-- Sentence Build -->
            <div v-if="showSentenceBuild" class="space-y-3">
              <div class="flex justify-between items-center mb-2">
                <h5 class="text-md font-medium text-gray-900">Sentence Build</h5>
                <button type="button" @click="addSentenceBuild"
                  class="text-blue-600 hover:text-blue-700">
                  <i class="fas fa-plus mr-1"></i>Add Sentence
                </button>
              </div>

              <div v-for="(sentence, index) in currentQuestion.sentence_build" :key="index"
                class="border rounded-lg p-4 bg-gray-50 space-y-3 mb-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium text-gray-700">Sentence {{ index + 1 }}</span>
                  <button type="button" @click="removeSentenceBuild(index)"
                    :disabled="currentQuestion.sentence_build.length <= 1"
                    class="text-red-600 hover:text-red-700 disabled:text-gray-400">
                    <i class="fas fa-times"></i>
                  </button>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Given Text</label>
                  <input type="text" v-model="sentence.given_text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the words to be arranged">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                  <input type="text" v-model="sentence.correct_answer"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the correct sentence">
                </div>
              </div>
            </div>

            <!-- Short Answer / Typing -->
            <div v-if="showTyping" class="space-y-3">
              <h5 class="text-md font-medium text-gray-900">Typing Answer</h5>

              <div class="space-y-2">
                <div v-for="(typing, index) in currentQuestion.typing_exercise" :key="index">
                  <div class="space-y-2">
                    <input type="text" v-model="typing.correct_answer"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Correct answer">
                    <label class="flex items-center">
                      <input type="checkbox" v-model="typing.is_case_sensitive"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                      <span class="ml-2 text-sm text-gray-700">Case Sensitive</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Question Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="closeQuestionModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {{ isEditingQuestion ? 'Update Question' : 'Add Question' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
