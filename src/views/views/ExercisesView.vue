<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { exercisesAPI, lessonsAPI, unitsAPI, courseAPI } from '@/utils/api.js'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// Shadcn Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'


// Lucide Icons
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  BookOpen, 
  Headphones, 
  PenTool, 
  FileText,
  CheckCircle2,
  X,
  MoreHorizontal,
  Image as ImageIcon,
  Volume2,
  AlertCircle,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-vue-next'

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
  { value: 'grammar', label: 'Grammar', icon: BookOpen },
  { value: 'listening', label: 'Listening', icon: Headphones },
  { value: 'reading', label: 'Reading', icon: FileText },
  { value: 'writing', label: 'Writing', icon: PenTool }
]

// Question types
const questionTypes = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle2 },
  { value: 'true_false', label: 'True/False', icon: CheckCircle2 },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', icon: PenTool },
  { value: 'matching', label: 'Matching Pairs', icon: Settings },
  { value: 'short_answer', label: 'Short Answer', icon: FileText }
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
    
    // Ensure question_type is set properly
    console.log('Loading question with type:', questionCopy.question_type);
    if (!questionCopy.question_type) {
      questionCopy.question_type = 'multiple_choice';
    }

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
  showModal.value = false
  showQuestionModal.value = true
}

const closeQuestionModal = () => {
  showQuestionModal.value = false
  showModal.value = true
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

  // Add type-specific data based on question_type directly
  const questionType = currentQuestion.question_type;
  console.log('Saving question of type:', questionType);
  
  if (questionType === 'multiple_choice' || questionType === 'true_false') {
    questionData.choices = currentQuestion.choices.filter(opt => opt.option_text.trim())
  } else if (questionType === 'fill_in_the_blank') {
    questionData.gap_filling = currentQuestion.gap_filling
  } else if (questionType === 'matching') {
    questionData.matching_pairs = currentQuestion.matching_pairs.filter(pair => pair.left_item.trim() && pair.right_item.trim())
  } else if (questionType === 'short_answer') {
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

const editQuestion = (index) => {
  isEditingQuestion.value = true
  currentQuestionIndex.value = index
  const question = form.questions[index]
  
  // Reset current question with the selected question's data
  Object.assign(currentQuestion, {
    id: question.id || null,
    question_type: question.question_type || 'multiple_choice',
    question_text: question.question_text || '',
    points: question.points || 1,
    order_number: question.order_number || index + 1,
    sample_answer: question.sample_answer || '',
    choices: question.choices || [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ],
    gap_filling: question.gap_filling || [
      { gap_number: 1, correct_answer: [] }
    ],
    matching_pairs: question.matching_pairs || [
      { left_item: '', right_item: '' }
    ],
    typing_exercise: question.typing_exercise || [
      { correct_answer: '', is_case_sensitive: false }
    ],
    sentence_build: question.sentence_build || [
      { given_text: '', correct_answer: '' }
    ]
  })
  
  showModal.value = false
  showQuestionModal.value = true
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

const getVisiblePages = () => {
  const pages = []
  const delta = 2 // Number of pages to show around current page
  
  for (let i = Math.max(2, currentPage.value - delta); 
       i <= Math.min(totalPages.value - 1, currentPage.value + delta); 
       i++) {
    pages.push(i)
  }
  
  if (currentPage.value - delta > 2) {
    pages.unshift('...')
  }
  if (currentPage.value + delta < totalPages.value - 1) {
    pages.push('...')
  }
  
  pages.unshift(1)
  if (totalPages.value !== 1) {
    pages.push(totalPages.value)
  }
  
  return [...new Set(pages)] // Remove duplicates
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

// Clear dependent filters when parent filter is cleared
watch(selectedCourse, (newValue) => {
  if (!newValue) {
    selectedUnit.value = ''
    selectedLesson.value = ''
  }
})

watch(selectedUnit, (newValue) => {
  if (!newValue) {
    selectedLesson.value = ''
  }
})

// Modal form watchers
watch(() => form.courseId, (newValue) => {
  if (!newValue) {
    form.unitId = ''
    form.lessonId = ''
  }
})

watch(() => form.unitId, (newValue) => {
  if (!newValue) {
    form.lessonId = ''
  }
})

// Watch for question type changes to ensure proper rendering of different question components
watch(() => currentQuestion.question_type, (newType) => {
  console.log('Question type changed to:', newType)
  // Reset/initialize form fields for the selected question type if needed
  if (newType === 'multiple_choice' && (!currentQuestion.choices || currentQuestion.choices.length < 2)) {
    currentQuestion.choices = [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  } else if (newType === 'fill_in_the_blank' && (!currentQuestion.gap_filling || currentQuestion.gap_filling.length === 0)) {
    currentQuestion.gap_filling = [{ gap_number: 1, correct_answer: [] }]
  } else if (newType === 'matching' && (!currentQuestion.matching_pairs || currentQuestion.matching_pairs.length === 0)) {
    currentQuestion.matching_pairs = [{ left_item: '', right_item: '' }]
  } else if (newType === 'short_answer' && (!currentQuestion.typing_exercise || currentQuestion.typing_exercise.length === 0)) {
    currentQuestion.typing_exercise = [{ correct_answer: '', is_case_sensitive: false }]
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight">Exercises Management</h1>
        <p class="text-muted-foreground">Manage your course exercises and assessments</p>
      </div>
      
      <!-- Create Exercise Dialog -->
      <Dialog v-model:open="showModal">
        <DialogTrigger asChild>
          <Button @click="openCreateModal">
            <Plus class="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </DialogTrigger>
        <DialogContent class="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Exercise' : 'Create New Exercise' }}</DialogTitle>
            <DialogDescription>
              {{ isEditMode ? 'Update exercise details and questions.' : 'Create a new exercise with questions for your students.' }}
            </DialogDescription>
          </DialogHeader>

          <form @submit.prevent="saveExercise" class="space-y-6">
            <!-- Error Alert -->
            <Alert v-if="error" variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <!-- Basic Information -->
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="title">
                  Title <span class="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  v-model="form.title"
                  placeholder="Enter exercise title"
                  required
                />
              </div>

              <div class="space-y-2">
                <Label>Exercise Type</Label>
                <Select v-model="form.exercise_type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select exercise type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="type in exerciseTypes" :key="type.value" :value="type.value">
                      <div class="flex items-center gap-2">
                        <component :is="type.icon" class="h-4 w-4" />
                        {{ type.label }}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <!-- Media URLs -->
            <div v-if="!showImagePreview" class="grid gap-4 md:grid-cols-2">
              <div v-if="showAudioField" class="space-y-2">
                <Label for="audio">Audio URL</Label>
                <Input
                  id="audio"
                  v-model="form.audio_url"
                  type="url"
                  placeholder="Enter audio URL"
                />
              </div>

              <div class="space-y-2">
                <Label for="image">Image URL</Label>
                <Input
                  id="image"
                  v-model="form.image_url"
                  type="url"
                  placeholder="Enter image URL"
                />
              </div>
            </div>

            <!-- Image Preview -->
            <Card v-if="showImagePreview" class="p-4">
              <CardHeader>
                <CardTitle class="flex items-center justify-between">
                  Exercise Image
                  <Button type="button" variant="destructive" size="sm" @click="form.image_url = ''">
                    <X class="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  :src="form.image_url" 
                  alt="Exercise image"
                  class="max-w-full h-64 object-cover rounded-lg border"
                  @error="form.image_url = ''"
                />
              </CardContent>
            </Card>

            <!-- Instructions -->
            <div class="space-y-2">
              <Label for="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                v-model="form.instructions"
                placeholder="Enter instructions for students"
                rows="3"
              />
            </div>

            <!-- Content -->
            <div class="space-y-2">
              <Label>Content</Label>
              <QuillEditor 
                v-if="useRichEditor" 
                v-model:content="form.content" 
                contentType="html" 
                theme="snow" 
                toolbar="full"
                class="bg-white border rounded-md" 
                placeholder="Enter main content/text for the exercise" 
              />
              <Textarea
                v-else
                v-model="form.content"
                placeholder="Enter main content/text for the exercise"
                rows="4"
              />
            </div>

            <!-- Course, Unit and Lesson Selection -->
            <div class="grid gap-4 md:grid-cols-3">
              <div class="space-y-2">
                <Label>Course <span class="text-destructive">*</span></Label>
                <Select v-model="form.courseId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                      {{ course.title }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label>Unit <span class="text-destructive">*</span></Label>
                <Select v-model="form.unitId" :disabled="!form.courseId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="unit in modalAvailableUnits" :key="unit.id" :value="unit.id">
                      {{ unit.title }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label>Lesson <span class="text-destructive">*</span></Label>
                <Select v-model="form.lessonId" :disabled="!form.unitId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="lesson in modalAvailableLessons" :key="lesson.id" :value="lesson.id">
                      {{ lesson.title }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <!-- Questions Management -->
            <Card>
              <CardHeader>
                <CardTitle>
                  Questions ({{ form.questions.length }})
                </CardTitle>
                <CardDescription>
                  Manage questions for this exercise
                </CardDescription>
              </CardHeader>
              <CardContent v-if="form.questions.length === 0" class="text-center py-8">
                <FileText class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p class="text-muted-foreground">No questions added yet</p>
              </CardContent>
              <CardContent v-else class="space-y-3">
                <div 
                  v-for="(question, index) in form.questions" 
                  :key="index"
                  class="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div class="flex-1">
                    <div class="font-medium">{{ question.question_text }}</div>
                    <div class="text-sm text-muted-foreground">
                      Type: {{ questionTypes.find(t => t.value === question.question_type)?.label }} • 
                      Points: {{ question.points }} • 
                      Order: {{ question.order_number }}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" @click.stop="deleteQuestion(index)">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Active Status -->
            <div class="flex items-center space-x-2">
              <Switch v-model="form.isActive" id="active-status" />
              <Label for="active-status">Exercise is active</Label>
            </div>

            <!-- Modal Actions -->
            <DialogFooter>
              <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
              <Button type="submit" :disabled="isLoading">
                <RefreshCw v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
                {{ isEditMode ? 'Update Exercise' : 'Create Exercise' }}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error && !showModal" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Filters -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Filter class="h-5 w-5" />
          Filters & Search
        </CardTitle>
        <CardDescription>Filter exercises by course, unit, lesson or search by title</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <!-- Search -->
          <div class="space-y-2">
            <Label for="search">Search Exercises</Label>
            <div class="relative">
              <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                v-model="searchQuery"
                placeholder="Search by title..."
                class="pl-8"
              />
            </div>
          </div>

          <!-- Course Filter -->
          <div class="space-y-2">
            <Label>Filter by Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.title }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button v-if="selectedCourse" variant="ghost" size="sm" @click="selectedCourse = ''" class="text-xs">
              Clear Filter
            </Button>
          </div>

          <!-- Unit Filter -->
          <div class="space-y-2">
            <Label>Filter by Unit</Label>
            <Select v-model="selectedUnit" :disabled="!selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="unit in availableUnits" :key="unit.id" :value="unit.id">
                  {{ unit.title }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button v-if="selectedUnit" variant="ghost" size="sm" @click="selectedUnit = ''" class="text-xs">
              Clear Filter
            </Button>
          </div>

          <!-- Lesson Filter -->
          <div class="space-y-2">
            <Label>Filter by Lesson</Label>
            <Select v-model="selectedLesson" :disabled="!selectedUnit">
              <SelectTrigger>
                <SelectValue placeholder="All Lessons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="lesson in availableLessons" :key="lesson.id" :value="lesson.id">
                  {{ lesson.title }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button v-if="selectedLesson" variant="ghost" size="sm" @click="selectedLesson = ''" class="text-xs">
              Clear Filter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Exercises Table -->
    <Card>
      <CardHeader>
        <CardTitle>Exercises ({{ filteredExercises.length }})</CardTitle>
        <CardDescription>Manage your exercises and questions</CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-8">
          <div class="space-y-3">
            <Skeleton v-for="i in 5" :key="i" class="h-16 w-full" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredExercises.length === 0" class="p-8 text-center">
          <BookOpen class="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <CardTitle class="mb-2">No exercises found</CardTitle>
          <CardDescription class="mb-4">
            {{ searchQuery || selectedCourse || selectedUnit || selectedLesson 
               ? 'Try adjusting your filters or search terms.' 
               : 'Create your first exercise to get started.' }}
          </CardDescription>
          <Button @click="openCreateModal" v-if="!searchQuery && !selectedCourse">
            <Plus class="h-4 w-4 mr-2" />
            Create Exercise
          </Button>
        </div>

        <!-- Desktop Table View -->
        <div v-else class="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Details</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="exercise in paginatedExercises" :key="exercise.id">
                <TableCell>
                  <div class="space-y-1">
                    <div class="font-medium">{{ exercise.title }}</div>
                    <div class="text-sm text-muted-foreground" v-if="exercise.instructions">
                      {{ exercise.instructions.length > 50 ? exercise.instructions.substring(0, 50) + '...' : exercise.instructions }}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <component :is="exerciseTypes.find(t => t.value === exercise.exercise_type)?.icon || BookOpen" class="h-4 w-4" />
                      <span class="text-sm">{{ getExerciseTypeLabel(exercise.exercise_type) }}</span>
                    </div>
                    <Badge variant="secondary" class="text-xs">
                      {{ exercise.questions ? exercise.questions.length : 0 }} Questions
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="text-sm">{{ getLessonNameById(exercise.lessonId) }}</div>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge variant="outline" class="text-xs">{{ getTotalPoints(exercise) }}pts</Badge>
                    <Badge v-if="exercise.audio_url" variant="secondary" class="text-xs">
                      <Volume2 class="h-3 w-3 mr-1" />
                      Audio
                    </Badge>
                    <Badge v-if="exercise.image_url" variant="secondary" class="text-xs">
                      <ImageIcon class="h-3 w-3 mr-1" />
                      Image
                    </Badge>
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="$router.push(`/exercises/${exercise.id}`)" 
                      class="flex items-center gap-1"
                    >
                      <Eye class="h-3 w-3" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="$router.push(`/exercises/${exercise.id}`)">
                        <Eye class="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openEditModal(exercise)">
                        <Edit class="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="deleteExercise(exercise.id)" class="text-destructive">
                        <Trash2 class="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Mobile Card View -->
        <div class="md:hidden space-y-4 p-4">
          <Card v-for="exercise in paginatedExercises" :key="exercise.id" class="p-4">
            <div class="space-y-3">
              <!-- Header -->
              <div class="flex items-start justify-between">
                <div class="space-y-1 flex-1">
                  <h3 class="font-medium">{{ exercise.title }}</h3>
                  <div class="flex items-center gap-2">
                    <component :is="exerciseTypes.find(t => t.value === exercise.exercise_type)?.icon || BookOpen" class="h-4 w-4" />
                    <span class="text-sm text-muted-foreground">{{ getExerciseTypeLabel(exercise.exercise_type) }}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="$router.push(`/exercises/${exercise.id}`)">
                      <Eye class="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openEditModal(exercise)">
                      <Edit class="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="deleteExercise(exercise.id)" class="text-destructive">
                      <Trash2 class="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <!-- Details -->
              <div class="space-y-2">
                <div class="text-sm text-muted-foreground">
                  <strong>Lesson:</strong> {{ getLessonNameById(exercise.lessonId) }}
                </div>
                <div class="flex flex-wrap gap-1 mb-2">
                  <Badge variant="outline" class="text-xs">{{ getTotalPoints(exercise) }}pts</Badge>
                  <Badge variant="secondary" class="text-xs">{{ exercise.questions ? exercise.questions.length : 0 }} Questions</Badge>
                  <Badge v-if="exercise.audio_url" variant="secondary" class="text-xs">
                    <Volume2 class="h-3 w-3 mr-1" />
                    Audio
                  </Badge>
                  <Badge v-if="exercise.image_url" variant="secondary" class="text-xs">
                    <ImageIcon class="h-3 w-3 mr-1" />
                    Image
                  </Badge>
                </div>
                
                <Button variant="outline" size="sm" class="w-full" @click="$router.push(`/exercises/${exercise.id}`)">
                  <Eye class="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>

              <!-- Status Toggle -->
              <div class="flex items-center justify-between pt-2 border-t">
                <span class="text-sm text-muted-foreground">Status</span>
                <div class="flex items-center gap-2">
                  <Switch 
                    :checked="exercise.isActive" 
                    @update:checked="toggleExerciseStatus(exercise)"
                    size="sm"
                  />
                  <span class="text-xs text-muted-foreground">
                    {{ exercise.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="flex justify-center items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        @click="previousPage" 
        :disabled="currentPage === 1"
      >
        Previous
      </Button>
      
      <div class="flex items-center gap-1">
        <template v-for="(page, index) in getVisiblePages()" :key="index">
          <Button 
            v-if="page !== '...'"
            :variant="currentPage === page ? 'default' : 'outline'"
            size="sm"
            @click="goToPage(page)"
          >
            {{ page }}
          </Button>
          <span v-else class="px-2 text-muted-foreground">...</span>
        </template>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        @click="nextPage" 
        :disabled="currentPage === totalPages"
      >
        Next
      </Button>
    </div>

    <!-- Question Modal (TODO: Convert to shadcn Dialog) -->
    <!-- For now, keeping the original question modal since it's complex -->
    <!-- This can be converted to a separate component later -->
    <div v-if="showQuestionModal" class="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-[60]" @keydown.esc="closeQuestionModal" tabindex="0">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Question Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium">
              {{ isEditingQuestion ? 'Edit' : 'Add' }} {{ getQuestionTypeLabel(currentQuestion.question_type) }} Question
            </h3>
            <Button variant="ghost" size="sm" @click="closeQuestionModal">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Question Modal Body -->
          <form @submit.prevent="saveQuestion" class="space-y-4">
            <!-- Question Type Selection - Important section highlighted -->
            <div class="p-3 border border-blue-200 bg-blue-50 rounded-md mb-4">
              <h4 class="text-sm font-medium text-blue-700 mb-2">Select Question Type</h4>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-2 col-span-2">
                  <Label for="question-type">Question Type</Label>
                  <Select v-model="currentQuestion.question_type" name="question-type">
                    <SelectTrigger id="question-type" class="bg-white">
                      <SelectValue :placeholder="getQuestionTypeLabel(currentQuestion.question_type)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="type in questionTypes" :key="type.value" :value="type.value">
                        <div class="flex items-center gap-2">
                          <component :is="type.icon" class="h-4 w-4" />
                          {{ type.label }}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <Label>Points</Label>
                  <Input type="number" v-model="currentQuestion.points" min="1" />
                </div>

                <div class="space-y-2">
                  <Label>Order</Label>
                  <Input type="number" v-model="currentQuestion.order_number" min="1" />
                </div>
              </div>
            </div>

            <!-- Question Text -->
            <div class="space-y-2">
              <Label>Question Text <span class="text-destructive">*</span></Label>
              <Textarea
                v-model="currentQuestion.question_text"
                rows="2"
                placeholder="Enter the question text"
                required
              />
            </div>

            <!-- Sample Answer -->
            <div class="space-y-2">
              <Label>Sample Answer (Optional)</Label>
              <Input
                v-model="currentQuestion.sample_answer"
                placeholder="Enter a sample answer or explanation"
              />
            </div>

            <!-- Type-specific fields -->
            <!-- Multiple Choice / True False Options -->
            <Card v-if="showQuestionOptions">
              <CardHeader>
                <CardTitle class="text-base">Answer Options</CardTitle>
                <CardDescription>Add answer choices and mark the correct ones</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-for="(option, index) in currentQuestion.choices" :key="index" class="flex items-center gap-3 p-3 border rounded-lg">
                  <Input 
                    v-model="option.option_text"
                    :placeholder="`Option ${index + 1}`"
                    class="flex-1"
                  />
                  <div class="flex items-center gap-2">
                    <Switch
                      v-model="option.is_correct"
                      id="`option-correct-${index}`"
                    />
                    <Label :for="`option-correct-${index}`" class="text-sm">Correct</Label>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    @click="removeOption(index)" 
                    :disabled="currentQuestion.choices.length <= 2"
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  v-if="currentQuestion.question_type === 'multiple_choice'" 
                  type="button" 
                  variant="outline" 
                  @click="addOption"
                  class="w-full"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </CardContent>
            </Card>

            <!-- Fill in the Blank / Gap Filling -->
            <Card v-if="showGapFilling">
              <CardHeader>
                <CardTitle class="text-base">Gap Answers</CardTitle>
                <CardDescription>Define the correct answers for each gap in your question text</CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <Card v-for="(gap, gapIndex) in currentQuestion.gap_filling" :key="gapIndex" class="p-4">
                  <div class="flex items-center justify-between mb-3">
                    <h6 class="font-medium">Gap {{ gap.gap_number }}</h6>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      @click="removeGapAnswer(gapIndex)"
                      :disabled="currentQuestion.gap_filling.length <= 1"
                    >
                      <Trash2 class="h-4 w-4 mr-1" />
                      Remove Gap
                    </Button>
                  </div>

                  <div class="space-y-2">
                    <div v-for="(answer, answerIndex) in gap.correct_answer" :key="answerIndex" class="flex items-center gap-2">
                      <Input 
                        v-model="gap.correct_answer[answerIndex]"
                        :placeholder="`Correct answer ${answerIndex + 1}`"
                        class="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        @click="removeAnswerFromGap(gapIndex, answerIndex)"
                        :disabled="gap.correct_answer.length <= 1"
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      @click="addAnswerToGap(gapIndex)"
                      class="w-full"
                      size="sm"
                    >
                      <Plus class="h-4 w-4 mr-2" />
                      Add Alternative Answer
                    </Button>
                  </div>
                </Card>

                <Button 
                  type="button" 
                  variant="outline" 
                  @click="addGapAnswer"
                  class="w-full"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add Gap
                </Button>
              </CardContent>
            </Card>

            <!-- Matching Pairs -->
            <Card v-if="showMatching">
              <CardHeader>
                <CardTitle class="text-base">Matching Pairs</CardTitle>
                <CardDescription>Create pairs of items that students need to match</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-for="(pair, index) in currentQuestion.matching_pairs" :key="index" class="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                  <Input 
                    v-model="pair.left_item"
                    placeholder="Left item"
                  />
                  <div class="flex items-center gap-2">
                    <Input 
                      v-model="pair.right_item"
                      placeholder="Right item"
                      class="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      @click="removeMatchingPair(index)"
                      :disabled="currentQuestion.matching_pairs.length <= 1"
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  @click="addMatchingPair"
                  class="w-full"
                >
                  <Plus class="h-4 w-4 mr-2" />
                  Add Pair
                </Button>
              </CardContent>
            </Card>

            <!-- Short Answer / Typing -->
            <Card v-if="showTyping">
              <CardHeader>
                <CardTitle class="text-base">Typing Answer</CardTitle>
                <CardDescription>Define the correct typed answer and sensitivity settings</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div v-for="(typing, index) in currentQuestion.typing_exercise" :key="index" class="space-y-3 p-3 border rounded-lg">
                  <Input 
                    v-model="typing.correct_answer"
                    placeholder="Correct answer"
                  />
                  <div class="flex items-center gap-2">
                    <Switch
                      v-model="typing.is_case_sensitive"
                      id="`case-sensitive-${index}`"
                    />
                    <Label :for="`case-sensitive-${index}`">Case Sensitive</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Question Modal Footer -->
            <div class="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" @click="closeQuestionModal">
                Cancel
              </Button>
              <Button type="submit">
                {{ isEditingQuestion ? 'Update Question' : 'Add Question' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
