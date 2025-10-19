<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  speakingAPI, 
  ieltsPart1API, 
  ieltsPart2API, 
  ieltsPart3API,
  uploadAPI
} from '@/utils/api.js'

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
  Edit, 
  Trash2, 
  Mic, 
  Volume2,
  Image as ImageIcon,
  FileAudio,
  ArrowLeft,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Users,
  Presentation,
  Upload,
  X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const modalType = ref('') // 'part1', 'part2', 'part3'
const isEditMode = ref(false)

// Upload states
const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref(null)
const fileInputKey = ref(0) // For resetting file input

// Data
const speakingExercise = ref(null)
const part1Questions = ref([])
const part2Questions = ref([])
const part3Questions = ref([])

// Form data for different types
const part1Form = reactive({
  id: null,
  speaking_id: null,
  question: '',
  type: 'part_1.1',
  image_url: '',
  image_file: null,
  audio_url: '',
  audio_file: null,
  sample_answer: ''
})

const part2Form = reactive({
  id: null,
  speaking_id: null,
  question: '',
  audio_url: '',
  audio_file: null,
  sample_answer: ''
})

const part3Form = reactive({
  id: null,
  speaking_id: null,
  question: '',
  audio_url: '',
  audio_file: null,
  sample_answer: ''
})

// Part 1 types
const part1Types = [
  { value: 'part_1.1', label: 'Part 1.1' },
  { value: 'part_1.2', label: 'Part 1.2' },
]

// Computed properties

// File upload methods
const handleFileSelect = (event, type) => {
  const file = event.target.files[0]
  if (!file) return
  
  selectedFile.value = { file, type }
}

const uploadFile = async (file, type) => {
  try {
    isUploading.value = true
    uploadProgress.value = 0
    
    const result = await uploadAPI.uploadFile(file, {
      onUploadProgress: (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100)
        }
      }
    })
    
    return result.url || result.file_url || result.path
  } catch (err) {
    console.error('Upload error:', err)
    throw new Error('Failed to upload file')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const removeFile = (formObj, field) => {
  formObj[field] = null
  selectedFile.value = null
  fileInputKey.value += 1 // Reset file input
}

// Methods
const fetchSpeakingExercise = async () => {
  try {
    const speakingId = route.params.id
    if (!speakingId) return
    
    isLoading.value = true
    error.value = ''
    
    const response = await speakingAPI.getById(speakingId)
    speakingExercise.value = response
    
    // Fetch all related exercises
    await Promise.all([
      fetchPart1Questions(),
      fetchPart2Questions(),
      fetchPart3Questions()
    ])
  } catch (err) {
    error.value = 'Failed to fetch speaking exercise details'
    console.error('Error fetching speaking exercise:', err)
  } finally {
    isLoading.value = false
  }
}


const fetchPart1Questions = async () => {
  try {
    const speakingId = route.params.id
    const response = await ieltsPart1API.getBySpeakingId(speakingId)
    part1Questions.value = response || []
  } catch (err) {
    console.error('Error fetching Part 1 questions:', err)
  }
}

const fetchPart2Questions = async () => {
  try {
    const speakingId = route.params.id
    const response = await ieltsPart2API.getBySpeakingId(speakingId)
    part2Questions.value = response || []
  } catch (err) {
    console.error('Error fetching Part 2 questions:', err)
  }
}

const fetchPart3Questions = async () => {
  try {
    const speakingId = route.params.id
    const response = await ieltsPart3API.getBySpeakingId(speakingId)
    part3Questions.value = response || []
  } catch (err) {
    console.error('Error fetching Part 3 questions:', err)
  }
}

const resetForms = () => {
  // Reset part1 form
  Object.assign(part1Form, {
    id: null,
    speaking_id: route.params.id,
    question: '',
    type: 'part_1.1',
    image_url: '',
    image_file: null,
    audio_url: '',
    audio_file: null,
    sample_answer: ''
  })
  
  // Reset part2 form
  Object.assign(part2Form, {
    id: null,
    speaking_id: route.params.id,
    question: '',
    audio_url: '',
    audio_file: null,
    sample_answer: ''
  })
  
  // Reset part3 form
  Object.assign(part3Form, {
    id: null,
    speaking_id: route.params.id,
    question: '',
    audio_url: '',
    audio_file: null,
    sample_answer: ''
  })
  
  // Reset file states
  selectedFile.value = null
  fileInputKey.value += 1
}

const openModal = (type) => {
  resetForms()
  modalType.value = type
  isEditMode.value = false
  showModal.value = true
}

const openEditModal = (type, item) => {
  modalType.value = type
  isEditMode.value = true
  
  switch (type) {
    case 'part1':
      Object.assign(part1Form, item)
      break
    case 'part2':
      Object.assign(part2Form, item)
      break
    case 'part3':
      Object.assign(part3Form, item)
      break
  }
  
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForms()
  modalType.value = ''
  isEditMode.value = false
}

const submitForm = async () => {
  try {
    isLoading.value = true
    error.value = ''
    
    let apiCall, formData
    
    switch (modalType.value) {
      case 'part1':
        if (!part1Form.question.trim()) {
          error.value = 'Please fill in all required fields'
          return
        }
        
        // Handle file uploads
        let imageUrl = part1Form.image_url
        let audioUrl1 = part1Form.audio_url
        
        if (part1Form.image_file) {
          imageUrl = await uploadFile(part1Form.image_file, 'image')
        }
        if (part1Form.audio_file) {
          audioUrl1 = await uploadFile(part1Form.audio_file, 'audio')
        }
        
        formData = {
          speaking_id: part1Form.speaking_id,
          question: part1Form.question.trim(),
          type: part1Form.type,
          image_url: imageUrl?.trim() || '',
          audio_url: audioUrl1?.trim() || '',
          sample_answer: part1Form.sample_answer?.trim() || ''
        }
        apiCall = isEditMode.value 
          ? ieltsPart1API.update(part1Form.id, formData)
          : ieltsPart1API.create(formData)
        break
        
      case 'part2':
        if (!part2Form.question.trim()) {
          error.value = 'Please fill in all required fields'
          return
        }
        
        // Handle audio file upload
        let audioUrl2 = part2Form.audio_url
        if (part2Form.audio_file) {
          audioUrl2 = await uploadFile(part2Form.audio_file, 'audio')
        }
        
        formData = {
          speaking_id: part2Form.speaking_id,
          question: part2Form.question.trim(),
          audio_url: audioUrl2?.trim() || '',
          sample_answer: part2Form.sample_answer?.trim() || ''
        }
        apiCall = isEditMode.value 
          ? ieltsPart2API.update(part2Form.id, formData)
          : ieltsPart2API.create(formData)
        break
        
      case 'part3':
        if (!part3Form.question.trim()) {
          error.value = 'Please fill in all required fields'
          return
        }
        
        // Handle audio file upload
        let audioUrl3 = part3Form.audio_url
        if (part3Form.audio_file) {
          audioUrl3 = await uploadFile(part3Form.audio_file, 'audio')
        }
        
        formData = {
          speaking_id: part3Form.speaking_id,
          question: part3Form.question.trim(),
          audio_url: audioUrl3?.trim() || '',
          sample_answer: part3Form.sample_answer?.trim() || ''
        }
        apiCall = isEditMode.value 
          ? ieltsPart3API.update(part3Form.id, formData)
          : ieltsPart3API.create(formData)
        break
    }
    
    await apiCall
    
    // Refresh the appropriate data
    switch (modalType.value) {
      case 'pronunciation':
        await fetchPronunciationExercises()
        break
      case 'part1':
        await fetchPart1Questions()
        break
      case 'part2':
        await fetchPart2Questions()
        break
      case 'part3':
        await fetchPart3Questions()
        break
    }
    
    closeModal()
  } catch (err) {
    error.value = `Failed to ${isEditMode.value ? 'update' : 'create'} ${modalType.value}`
    console.error('Error submitting form:', err)
  } finally {
    isLoading.value = false
  }
}

const deleteItem = async (type, id) => {
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return
  
  try {
    isLoading.value = true
    error.value = ''
    
    switch (type) {
      case 'part1':
        await ieltsPart1API.delete(id)
        await fetchPart1Questions()
        break
      case 'part2':
        await ieltsPart2API.delete(id)
        await fetchPart2Questions()
        break
      case 'part3':
        await ieltsPart3API.delete(id)
        await fetchPart3Questions()
        break
    }
  } catch (err) {
    error.value = `Failed to delete ${type}`
    console.error(`Error deleting ${type}:`, err)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/speaking')
}

const getModalTitle = () => {
  const action = isEditMode.value ? 'Edit' : 'Add'
  switch (modalType.value) {
    case 'part1': return `${action} IELTS Part 1 Question`
    case 'part2': return `${action} IELTS Part 2 Question`
    case 'part3': return `${action} IELTS Part 3 Question`
    default: return action
  }
}

// Initialize data
onMounted(() => {
  fetchSpeakingExercise()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="outline" @click="goBack" class="flex items-center gap-2">
          <ArrowLeft class="w-4 h-4" />
          Back to Speaking
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            {{ speakingExercise?.title || 'Speaking Exercise Details' }}
          </h1>
          <p class="text-muted-foreground">
            Manage pronunciation exercises and IELTS speaking questions
          </p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-6">
      <AlertCircle class="w-4 h-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Speaking Exercise Info -->
    <Card v-if="speakingExercise">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Mic class="w-5 h-5" />
          {{ speakingExercise.title }}
        </CardTitle>
        <CardDescription>
          Type: 
          <Badge variant="secondary" class="ml-2 capitalize">
            {{ speakingExercise.type }}
          </Badge>
        </CardDescription>
      </CardHeader>
    </Card>

    <!-- Content Tabs -->
    <Tabs default-value="part1" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="part1" class="flex items-center gap-2">
          <MessageSquare class="w-4 h-4" />
          Part 1
        </TabsTrigger>
        <TabsTrigger value="part2" class="flex items-center gap-2">
          <Users class="w-4 h-4" />
          Part 2
        </TabsTrigger>
        <TabsTrigger value="part3" class="flex items-center gap-2">
          <Presentation class="w-4 h-4" />
          Part 3
        </TabsTrigger>
      </TabsList>

      <!-- Part 1 Tab -->
      <TabsContent value="part1">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>IELTS Part 1 Questions</span>
              <Button @click="openModal('part1')" class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                Add Part 1 Question
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>
            
            <div v-else-if="part1Questions.length === 0" class="text-center py-8">
              <MessageSquare class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">No Part 1 questions</p>
              <p class="text-gray-600">Add your first Part 1 question.</p>
            </div>
            
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Sample Answer</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="question in part1Questions" :key="question.id">
                  <TableCell class="font-medium max-w-md">
                    {{ question.question.substring(0, 80) }}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{{ question.type }}</Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex gap-1">
                      <Badge v-if="question.image_url" variant="secondary" class="text-xs">
                        <ImageIcon class="w-3 h-3 mr-1" />
                        Image
                      </Badge>
                      <Badge v-if="question.audio_url" variant="secondary" class="text-xs">
                        <FileAudio class="w-3 h-3 mr-1" />
                        Audio
                      </Badge>
                      <span v-if="!question.image_url && !question.audio_url" class="text-muted-foreground text-xs">
                        No media
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.sample_answer" variant="secondary">Available</Badge>
                    <span v-else class="text-muted-foreground">No sample</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="openEditModal('part1', question)">
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          @click="deleteItem('part1', question.id)"
                          class="text-red-600"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Part 2 Tab -->
      <TabsContent value="part2">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>IELTS Part 2 Questions</span>
              <Button @click="openModal('part2')" class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                Add Part 2 Question
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>
            
            <div v-else-if="part2Questions.length === 0" class="text-center py-8">
              <Users class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">No Part 2 questions</p>
              <p class="text-gray-600">Add your first Part 2 question.</p>
            </div>
            
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Audio</TableHead>
                  <TableHead>Sample Answer</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="question in part2Questions" :key="question.id">
                  <TableCell class="font-medium max-w-md">
                    {{ question.question.substring(0, 80) }}...
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.audio_url" variant="secondary">
                      <FileAudio class="w-3 h-3 mr-1" />
                      Audio Available
                    </Badge>
                    <span v-else class="text-muted-foreground">No audio</span>
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.sample_answer" variant="secondary">Available</Badge>
                    <span v-else class="text-muted-foreground">No sample</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="openEditModal('part2', question)">
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          @click="deleteItem('part2', question.id)"
                          class="text-red-600"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Part 3 Tab -->
      <TabsContent value="part3">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>IELTS Part 3 Questions</span>
              <Button @click="openModal('part3')" class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                Add Part 3 Question
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="isLoading" class="space-y-3">
              <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
            </div>
            
            <div v-else-if="part3Questions.length === 0" class="text-center py-8">
              <Presentation class="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p class="text-lg font-medium text-gray-900">No Part 3 questions</p>
              <p class="text-gray-600">Add your first Part 3 question.</p>
            </div>
            
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Audio</TableHead>
                  <TableHead>Sample Answer</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="question in part3Questions" :key="question.id">
                  <TableCell class="font-medium max-w-md">
                    {{ question.question.substring(0, 80) }}...
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.audio_url" variant="secondary">
                      <FileAudio class="w-3 h-3 mr-1" />
                      Audio Available
                    </Badge>
                    <span v-else class="text-muted-foreground">No audio</span>
                  </TableCell>
                  <TableCell>
                    <Badge v-if="question.sample_answer" variant="secondary">Available</Badge>
                    <span v-else class="text-muted-foreground">No sample</span>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="openEditModal('part3', question)">
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          @click="deleteItem('part3', question.id)"
                          class="text-red-600"
                        >
                          <Trash2 class="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Modal for Adding/Editing -->
    <Dialog :open="showModal" @update:open="closeModal">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ getModalTitle() }}</DialogTitle>
          <DialogDescription>
            {{ isEditMode ? 'Update the details below.' : 'Add new content to the speaking exercise.' }}
          </DialogDescription>
        </DialogHeader>

        <!-- Part 1 Form -->
        <form v-if="modalType === 'part1'" @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="question">Question *</Label>
            <Textarea
              id="question"
              v-model="part1Form.question"
              placeholder="What kind of food do you like to eat?"
              rows="3"
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="type">Type</Label>
            <Select v-model="part1Form.type">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in part1Types" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div class="space-y-2">
            <Label>Image</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label for="image-url" class="text-sm text-muted-foreground">Image URL</Label>
                <Input
                  id="image-url"
                  v-model="part1Form.image_url"
                  placeholder="https://storage.example.com/images/question1.jpg"
                  type="url"
                  :disabled="!!part1Form.image_file"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="image-file" class="text-sm text-muted-foreground">Or Upload Image File</Label>
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'img'"
                    id="image-file"
                    type="file"
                    accept="image/*"
                    @change="(e) => { part1Form.image_file = e.target.files[0]; part1Form.image_url = '' }"
                    :disabled="!!part1Form.image_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part1Form.image_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="() => { part1Form.image_file = null; fileInputKey += 1 }"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div v-if="part1Form.image_file" class="text-sm text-muted-foreground">
                  Selected: {{ part1Form.image_file.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label for="part1-audio-url" class="text-sm text-muted-foreground">Audio URL</Label>
                <Input
                  id="part1-audio-url"
                  v-model="part1Form.audio_url"
                  placeholder="https://storage.example.com/audio/question1.mp3"
                  type="url"
                  :disabled="!!part1Form.audio_file"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="part1-audio-file" class="text-sm text-muted-foreground">Or Upload Audio File</Label>
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'audio'"
                    id="part1-audio-file"
                    type="file"
                    accept="audio/*"
                    @change="(e) => { part1Form.audio_file = e.target.files[0]; part1Form.audio_url = '' }"
                    :disabled="!!part1Form.audio_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part1Form.audio_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="() => { part1Form.audio_file = null; fileInputKey += 1 }"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div v-if="part1Form.audio_file" class="text-sm text-muted-foreground">
                  Selected: {{ part1Form.audio_file.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <Label for="sample">Sample Answer</Label>
            <Textarea
              id="sample"
              v-model="part1Form.sample_answer"
              placeholder="I really enjoy eating various types of Asian cuisine..."
              rows="4"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="isLoading || isUploading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>

        <!-- Part 2 Form -->
        <form v-else-if="modalType === 'part2'" @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="question">Question *</Label>
            <Textarea
              id="question"
              v-model="part2Form.question"
              placeholder="Describe a place you like to visit in your free time..."
              rows="5"
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label for="part2-audio-url" class="text-sm text-muted-foreground">Audio URL</Label>
                <Input
                  id="part2-audio-url"
                  v-model="part2Form.audio_url"
                  placeholder="https://storage.example.com/audio/part2-question1.mp3"
                  type="url"
                  :disabled="!!part2Form.audio_file"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="part2-audio-file" class="text-sm text-muted-foreground">Or Upload Audio File</Label>
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'part2'"
                    id="part2-audio-file"
                    type="file"
                    accept="audio/*"
                    @change="(e) => { part2Form.audio_file = e.target.files[0]; part2Form.audio_url = '' }"
                    :disabled="!!part2Form.audio_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part2Form.audio_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="() => { part2Form.audio_file = null; fileInputKey += 1 }"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div v-if="part2Form.audio_file" class="text-sm text-muted-foreground">
                  Selected: {{ part2Form.audio_file.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <Label for="sample">Sample Answer</Label>
            <Textarea
              id="sample"
              v-model="part2Form.sample_answer"
              placeholder="I would like to talk about my favorite local park..."
              rows="4"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="isLoading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>

        <!-- Part 3 Form -->
        <form v-else-if="modalType === 'part3'" @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="question">Question *</Label>
            <Textarea
              id="question"
              v-model="part3Form.question"
              placeholder="What are some of the main environmental challenges facing cities today?"
              rows="3"
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <div class="space-y-2">
                <Label for="part3-audio-url" class="text-sm text-muted-foreground">Audio URL</Label>
                <Input
                  id="part3-audio-url"
                  v-model="part3Form.audio_url"
                  placeholder="https://storage.example.com/audio/part3-question1.mp3"
                  type="url"
                  :disabled="!!part3Form.audio_file"
                />
              </div>
              
              <div class="space-y-2">
                <Label for="part3-audio-file" class="text-sm text-muted-foreground">Or Upload Audio File</Label>
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey + 'part3'"
                    id="part3-audio-file"
                    type="file"
                    accept="audio/*"
                    @change="(e) => { part3Form.audio_file = e.target.files[0]; part3Form.audio_url = '' }"
                    :disabled="!!part3Form.audio_url || isUploading"
                    class="flex-1"
                  />
                  <Button
                    v-if="part3Form.audio_file"
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="() => { part3Form.audio_file = null; fileInputKey += 1 }"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                <div v-if="part3Form.audio_file" class="text-sm text-muted-foreground">
                  Selected: {{ part3Form.audio_file.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <Label for="sample">Sample Answer</Label>
            <Textarea
              id="sample"
              v-model="part3Form.sample_answer"
              placeholder="Cities today face several significant environmental challenges..."
              rows="4"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="isLoading || isUploading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 animate-spin mr-2" />
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>