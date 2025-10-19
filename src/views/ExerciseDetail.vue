<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
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
  Settings,
  ArrowLeft
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const isEditMode = ref(false)
const showQuestionModal = ref(false)
const isEditingQuestion = ref(false)
const currentQuestionIndex = ref(-1)
const activeTab = ref('overview')

// Data
const exercise = ref(null)
const courses = ref([])
const units = ref([])
const lessons = ref([])

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
const lessonName = computed(() => {
  const lessonId = exercise.value?.lessonId
  if (!lessonId) return 'Unknown Lesson'
  const lesson = lessons.value.find(l => l.id === lessonId)
  return lesson ? lesson.title : 'Unknown Lesson'
})

const unitName = computed(() => {
  const lessonId = exercise.value?.lessonId
  if (!lessonId) return 'Unknown Unit'
  const lesson = lessons.value.find(l => l.id === lessonId)
  if (!lesson || !lesson.moduleId) return 'Unknown Unit'
  const unit = units.value.find(u => u.id === lesson.moduleId)
  return unit ? unit.title : 'Unknown Unit'
})

const courseName = computed(() => {
  const lessonId = exercise.value?.lessonId
  if (!lessonId) return 'Unknown Course'
  const lesson = lessons.value.find(l => l.id === lessonId)
  if (!lesson || !lesson.moduleId) return 'Unknown Course'
  const unit = units.value.find(u => u.id === lesson.moduleId)
  if (!unit || !unit.courseId) return 'Unknown Course'
  const course = courses.value.find(c => c.id === unit.courseId)
  return course ? course.title : 'Unknown Course'
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

const getTotalPoints = computed(() => {
  if (!exercise.value || !exercise.value.questions || !Array.isArray(exercise.value.questions)) return 0
  return exercise.value.questions.reduce((total, question) => total + (question.points || 0), 0)
})

// Functions
const fetchExercise = async () => {
  const exerciseId = route.params.id
  if (!exerciseId) {
    router.push('/exercises')
    return
  }

  isLoading.value = true
  try {
    const response = await exercisesAPI.getById(exerciseId)
    exercise.value = response.data || response
    
    // Copy exercise data to form for editing
    updateFormFromExercise()
  } catch (err) {
    error.value = `Failed to fetch exercise: ${err.message || 'Unknown error'}`
    console.error('Error fetching exercise:', err)
    exercise.value = null
  } finally {
    isLoading.value = false
  }
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

const updateFormFromExercise = () => {
  if (!exercise.value) return
  
  form.id = exercise.value.id
  form.title = exercise.value.title
  form.exercise_type = exercise.value.exercise_type || 'grammar'
  form.audio_url = exercise.value.audio_url || ''
  form.image_url = exercise.value.image_url || ''
  form.instructions = exercise.value.instructions || ''
  form.content = exercise.value.content || ''
  form.isActive = exercise.value.isActive
  form.lessonId = exercise.value.lessonId

  // Populate course and unit based on the selected lesson
  if (exercise.value.lessonId) {
    const lesson = lessons.value.find(l => l.id === exercise.value.lessonId)
    if (lesson) {
      form.unitId = lesson.moduleId
      const unit = units.value.find(u => u.id === lesson.moduleId)
      if (unit) {
        form.courseId = unit.courseId
      }
    }
  }

  // Handle questions array and parse gap filling correct_answer strings to arrays
  if (exercise.value.questions && Array.isArray(exercise.value.questions)) {
    form.questions = exercise.value.questions.map(question => {
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
      
      return questionCopy
    })
  } else {
    form.questions = []
  }
}

const openEditModal = () => {
  isEditMode.value = true
  updateFormFromExercise()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

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
    const question = exercise.value.questions[questionIndex]

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
    currentQuestion.order_number = (exercise.value.questions?.length || 0) + 1
  }
  showQuestionModal.value = true
}

const closeQuestionModal = () => {
  showQuestionModal.value = false
  resetCurrentQuestion()
}

const saveQuestion = async () => {
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

  isLoading.value = true
  try {
    // Update or add question
    if (isEditingQuestion.value && currentQuestionIndex.value >= 0) {
      // Update existing question in the exercise
      const updatedQuestions = [...exercise.value.questions]
      updatedQuestions[currentQuestionIndex.value] = { 
        ...questionData, 
        id: currentQuestion.id 
      }
      
      // Update the exercise with the modified questions array
      const updatedExercise = { 
        ...exercise.value,
        questions: updatedQuestions
      }
      
      const response = await exercisesAPI.update(exercise.value.id, updatedExercise)
      exercise.value = response.data || response || updatedExercise
    } else {
      // Add new question to the exercise
      const updatedQuestions = [...(exercise.value.questions || []), questionData]
      
      // Update the exercise with the modified questions array
      const updatedExercise = { 
        ...exercise.value,
        questions: updatedQuestions
      }
      
      const response = await exercisesAPI.update(exercise.value.id, updatedExercise)
      exercise.value = response.data || response || updatedExercise
    }
    
    // Close modal and reset
    closeQuestionModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save question: ${err.message || 'Unknown error'}`
    console.error('Error saving question:', err)
  } finally {
    isLoading.value = false
  }
}

const deleteQuestion = async (index) => {
  if (!confirm('Are you sure you want to delete this question?')) return
  
  isLoading.value = true
  try {
    // Remove question from the array
    const updatedQuestions = [...exercise.value.questions]
    updatedQuestions.splice(index, 1)
    
    // Update order numbers
    updatedQuestions.forEach((q, i) => {
      q.order_number = i + 1
    })
    
    // Update the exercise with the modified questions array
    const updatedExercise = { 
      ...exercise.value,
      questions: updatedQuestions
    }
    
    const response = await exercisesAPI.update(exercise.value.id, updatedExercise)
    exercise.value = response.data || response || updatedExercise
    
    error.value = ''
  } catch (err) {
    error.value = `Failed to delete question: ${err.message || 'Unknown error'}`
    console.error('Error deleting question:', err)
  } finally {
    isLoading.value = false
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

    const response = await exercisesAPI.update(form.id, exerciseData)
    exercise.value = response.data || response || {
      ...exercise.value,
      ...exerciseData
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

const toggleExerciseStatus = async () => {
  if (!exercise.value) return
  
  const originalStatus = exercise.value.isActive
  try {
    exercise.value.isActive = !exercise.value.isActive
    const updatedExercise = {
      ...exercise.value,
      isActive: exercise.value.isActive
    }
    await exercisesAPI.update(exercise.value.id, updatedExercise)
    error.value = ''
  } catch (err) {
    exercise.value.isActive = originalStatus
    error.value = `Failed to update exercise status: ${err.message || 'Unknown error'}`
    console.error('Error updating exercise status:', err)
  }
}

const goBack = () => {
  router.push('/exercises')
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

// Watchers
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

// Initialize data
onMounted(async () => {
  await Promise.all([
    fetchCourses(),
    fetchUnits(),
    fetchLessons()
  ])
  await fetchExercise()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <Button variant="outline" @click="goBack" class="flex items-center gap-2">
          <ArrowLeft class="w-4 h-4" />
          Back to Exercises
        </Button>
        <div class="space-y-1">
          <h1 class="text-3xl font-bold tracking-tight" v-if="exercise">{{ exercise.title }}</h1>
          <h1 class="text-3xl font-bold tracking-tight" v-else>Exercise Details</h1>
          <p class="text-muted-foreground">View and manage exercise details and questions</p>
        </div>
      </div>
      
      <div class="flex gap-2">
        <Button v-if="exercise" variant="outline" @click="openEditModal" class="flex items-center gap-2">
          <Edit class="w-4 h-4" />
          Edit Exercise
        </Button>
        <Button v-if="exercise" @click="openQuestionModal()" class="flex items-center gap-2">
          <Plus class="w-4 h-4" />
          Add Question
        </Button>
      </div>
    </div>
    
    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Loading State -->
    <div v-if="isLoading && !exercise" class="space-y-4">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <div v-else-if="!exercise" class="text-center py-12">
      <FileText class="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h2 class="text-2xl font-bold mb-2">Exercise Not Found</h2>
      <p class="text-muted-foreground mb-4">The exercise you're looking for doesn't exist or couldn't be loaded.</p>
      <Button @click="goBack">Return to Exercise List</Button>
    </div>

    <div v-else class="space-y-6">
      <!-- Tabs Navigation -->
      <Tabs v-model="activeTab" class="w-full">
        <TabsList>
          <TabsTrigger value="overview" class="flex items-center gap-2">
            <FileText class="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="questions" class="flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4" />
            Questions ({{ exercise.questions?.length || 0 }})
          </TabsTrigger>
        </TabsList>

        <!-- Overview Tab -->
        <TabsContent value="overview">
          <!-- Exercise Details Card -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <component :is="exerciseTypes.find(t => t.value === exercise.exercise_type)?.icon || BookOpen" class="w-5 h-5" />
                  {{ exercise.title }}
                </div>
                <Badge :variant="exercise.isActive ? 'default' : 'outline'">
                  {{ exercise.isActive ? 'Active' : 'Inactive' }}
                </Badge>
              </CardTitle>
              <CardDescription>
                <div class="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">{{ getExerciseTypeLabel(exercise.exercise_type) }}</Badge>
                  <Badge variant="outline">{{ getTotalPoints }} Points</Badge>
                  <Badge v-if="exercise.audio_url" variant="secondary" class="flex items-center gap-1">
                    <Volume2 class="h-3 w-3" />
                    Audio
                  </Badge>
                  <Badge v-if="exercise.image_url" variant="secondary" class="flex items-center gap-1">
                    <ImageIcon class="h-3 w-3" />
                    Image
                  </Badge>
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent class="space-y-6">
              <!-- Course Path -->
              <div class="space-y-2">
                <Label>Course Path</Label>
                <div class="text-sm text-muted-foreground">
                  {{ courseName }} &rarr; {{ unitName }} &rarr; {{ lessonName }}
                </div>
              </div>
              
              <!-- Instructions -->
              <div v-if="exercise.instructions" class="space-y-2">
                <Label>Instructions</Label>
                <div class="text-sm border rounded-md p-3 bg-gray-50">
                  {{ exercise.instructions }}
                </div>
              </div>

              <!-- Image -->
              <div v-if="exercise.image_url" class="space-y-2">
                <Label>Image</Label>
                <div class="border rounded-md overflow-hidden">
                  <img 
                    :src="exercise.image_url" 
                    :alt="exercise.title" 
                    class="max-w-full max-h-[400px] object-contain mx-auto" 
                  />
                </div>
              </div>

              <!-- Audio -->
              <div v-if="exercise.audio_url" class="space-y-2">
                <Label>Audio</Label>
                <div>
                  <audio controls class="w-full">
                    <source :src="exercise.audio_url" type="audio/mpeg">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>

              <!-- Content -->
              <div v-if="exercise.content" class="space-y-2">
                <Label>Content</Label>
                <div class="border rounded-md p-3 overflow-auto max-h-96">
                  <div v-if="exercise.exercise_type === 'reading' || exercise.exercise_type === 'writing'" v-html="exercise.content"></div>
                  <div v-else class="whitespace-pre-wrap">{{ exercise.content }}</div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter class="flex justify-between">
              <div class="text-sm text-muted-foreground">
                Last updated: {{ new Date(exercise.updatedAt).toLocaleDateString() }}
              </div>
              <div class="flex items-center gap-2">
                <Label>Active Status</Label>
                <Switch
                  :checked="exercise.isActive"
                  @update:checked="toggleExerciseStatus"
                />
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <!-- Questions Tab -->
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center justify-between">
                <span>Questions ({{ exercise.questions?.length || 0 }})</span>
                <Button @click="openQuestionModal()" class="flex items-center gap-2">
                  <Plus class="w-4 h-4" />
                  Add Question
                </Button>
              </CardTitle>
              <CardDescription>Manage questions for this exercise</CardDescription>
            </CardHeader>
            
            <CardContent>
              <!-- Empty state -->
              <div v-if="!exercise.questions?.length" class="text-center py-8">
                <FileText class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p class="text-muted-foreground">No questions added yet</p>
                <Button @click="openQuestionModal()" variant="outline" class="mt-4">
                  <Plus class="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
              
              <!-- Questions list -->
              <div v-else class="space-y-4">
                <Card v-for="(question, index) in exercise.questions" :key="index" class="overflow-hidden">
                  <CardHeader class="bg-gray-50 p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-start gap-2">
                        <Badge class="mt-1">Q{{ question.order_number }}</Badge>
                        <div>
                          <div class="font-medium">{{ question.question_text }}</div>
                          <div class="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant="outline">{{ getQuestionTypeLabel(question.question_type) }}</Badge>
                            <Badge variant="outline">{{ question.points }} Points</Badge>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <Button variant="ghost" size="sm" @click="openQuestionModal(index)">
                          <Edit class="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" @click="deleteQuestion(index)">
                          <Trash2 class="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent class="p-4">
                    <!-- Multiple Choice Options -->
                    <div v-if="question.question_type === 'multiple_choice' || question.question_type === 'true_false'">
                      <h4 class="text-sm font-medium mb-2">Options:</h4>
                      <ul class="space-y-2">
                        <li 
                          v-for="(option, optIndex) in question.choices" 
                          :key="optIndex"
                          class="flex items-center gap-2 text-sm"
                        >
                          <Badge v-if="option.is_correct" variant="default" class="h-5 w-5 rounded-full p-0 flex items-center justify-center">✓</Badge>
                          <Badge v-else variant="outline" class="h-5 w-5 rounded-full p-0 flex items-center justify-center">{{ optIndex + 1 }}</Badge>
                          {{ option.option_text }}
                        </li>
                      </ul>
                    </div>

                    <!-- Fill in the blanks -->
                    <div v-else-if="question.question_type === 'fill_in_the_blank'">
                      <h4 class="text-sm font-medium mb-2">Gaps:</h4>
                      <div 
                        v-for="(gap, gapIndex) in question.gap_filling" 
                        :key="gapIndex"
                        class="mb-2"
                      >
                        <div class="flex items-center gap-2">
                          <Badge variant="outline">Gap {{ gap.gap_number }}</Badge>
                          <span class="text-sm">Answers: {{ Array.isArray(gap.correct_answer) ? gap.correct_answer.join(', ') : gap.correct_answer }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Matching pairs -->
                    <div v-else-if="question.question_type === 'matching'">
                      <h4 class="text-sm font-medium mb-2">Matching Pairs:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Left Item</TableHead>
                            <TableHead>Right Item</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow 
                            v-for="(pair, pairIndex) in question.matching_pairs" 
                            :key="pairIndex"
                          >
                            <TableCell class="font-medium">{{ pair.left_item }}</TableCell>
                            <TableCell>{{ pair.right_item }}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <!-- Short answer -->
                    <div v-else-if="question.question_type === 'short_answer' && question.typing_exercise">
                      <h4 class="text-sm font-medium mb-2">Short Answer:</h4>
                      <div v-for="(item, itemIndex) in question.typing_exercise" :key="itemIndex" class="mb-1 text-sm">
                        <Badge variant="outline" class="mr-2">Answer {{ itemIndex + 1 }}</Badge>
                        {{ item.correct_answer }}
                        <Badge v-if="item.is_case_sensitive" variant="secondary" class="ml-2 text-xs">Case Sensitive</Badge>
                      </div>
                    </div>

                    <!-- Sample Answer -->
                    <div v-if="question.sample_answer" class="mt-4 pt-3 border-t">
                      <h4 class="text-sm font-medium mb-1">Sample Answer:</h4>
                      <p class="text-sm text-muted-foreground">{{ question.sample_answer }}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <!-- Edit Exercise Modal -->
    <Dialog v-model:open="showModal">
      <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Update the exercise details below.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveExercise" class="space-y-6">
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
              Update Exercise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Question Modal -->
    <div v-if="showQuestionModal" class="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-[60]" @keydown.esc="closeQuestionModal" tabindex="0">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white" style="z-index: 70;">
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
            <div class="p-4 border border-blue-300 bg-blue-50 rounded-md mb-4 shadow-sm">
              <h4 class="text-sm font-medium text-blue-700 mb-2">Select Question Type</h4>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-2 col-span-2">
                  <Label for="question-type">Question Type</Label>
                  <Select v-model="currentQuestion.question_type" name="question-type">
                    <SelectTrigger id="question-type" class="bg-white">
                      <SelectValue :placeholder="getQuestionTypeLabel(currentQuestion.question_type)" />
                    </SelectTrigger>
                    <SelectContent position="popper" :side="'bottom'" :align="'start'" class="z-[100]">
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
              </div>
            </div>

            <!-- Question Text -->
            <div class="space-y-2">
              <Label>Question Text <span class="text-destructive">*</span></Label>
              <Textarea
                v-model="currentQuestion.question_text"
                rows="2"
                placeholder="Enter your question here..."
                required
              />
            </div>

            <!-- Multiple Choice Options -->
            <div v-if="showQuestionOptions" class="space-y-4">
              <div class="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addOption"
                  class="flex items-center gap-1"
                >
                  <Plus class="h-3 w-3" />
                  Add Option
                </Button>
              </div>

              <div
                v-for="(option, index) in currentQuestion.choices"
                :key="index"
                class="grid grid-cols-[1fr_auto] gap-2 items-start"
              >
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <Switch
                      v-model="option.is_correct"
                      :id="`correct-${index}`"
                      class="data-[state=checked]:bg-green-500"
                    />
                    <Input
                      v-model="option.option_text"
                      :placeholder="`Option ${index + 1}`"
                    />
                  </div>
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
            </div>

            <!-- Fill in the blank -->
            <div v-if="showGapFilling" class="space-y-4">
              <div class="flex items-center justify-between">
                <Label>Fill in the Gaps</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addGapAnswer"
                  class="flex items-center gap-1"
                >
                  <Plus class="h-3 w-3" />
                  Add Gap
                </Button>
              </div>
              
              <div
                v-for="(gap, gapIndex) in currentQuestion.gap_filling"
                :key="gapIndex"
                class="border p-3 rounded-md space-y-3"
              >
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-medium">Gap {{ gap.gap_number }}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="removeGapAnswer(gapIndex)"
                    :disabled="currentQuestion.gap_filling.length <= 1"
                  >
                    <X class="h-4 w-4" />
                  </Button>
                </div>
                
                <div
                  v-for="(answer, answerIndex) in gap.correct_answer"
                  :key="answerIndex"
                  class="flex items-center gap-2"
                >
                  <Input
                    v-model="gap.correct_answer[answerIndex]"
                    placeholder="Correct answer"
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
                  size="sm"
                  @click="addAnswerToGap(gapIndex)"
                  class="flex items-center gap-1"
                >
                  <Plus class="h-3 w-3" />
                  Add Alternative Answer
                </Button>
              </div>
            </div>

            <!-- Matching Pairs -->
            <div v-if="showMatching" class="space-y-4">
              <div class="flex items-center justify-between">
                <Label>Matching Pairs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addMatchingPair"
                  class="flex items-center gap-1"
                >
                  <Plus class="h-3 w-3" />
                  Add Pair
                </Button>
              </div>
              
              <div
                v-for="(pair, index) in currentQuestion.matching_pairs"
                :key="index"
                class="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
              >
                <Input
                  v-model="pair.left_item"
                  placeholder="Left item"
                />
                <Input
                  v-model="pair.right_item"
                  placeholder="Right item"
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

            <!-- Typing Exercise -->
            <div v-if="showTyping" class="space-y-3">
              <Label>Short Answer</Label>
              
              <div
                v-for="(answer, index) in currentQuestion.typing_exercise"
                :key="index"
                class="flex gap-2 items-start"
              >
                <div class="flex-1 space-y-2">
                  <Input
                    v-model="answer.correct_answer"
                    placeholder="Correct answer"
                  />
                  <div class="flex items-center space-x-2">
                    <Switch
                      v-model="answer.is_case_sensitive"
                      :id="`case-sensitive-${index}`"
                    />
                    <Label :for="`case-sensitive-${index}`" class="text-sm">Case sensitive</Label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sample Answer -->
            <div class="space-y-2">
              <Label>Sample Answer</Label>
              <Textarea
                v-model="currentQuestion.sample_answer"
                rows="3"
                placeholder="Provide a sample answer (optional)"
              />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                @click="closeQuestionModal"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                :disabled="isLoading"
              >
                <RefreshCw v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
                {{ isEditingQuestion ? 'Update' : 'Add' }} Question
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>