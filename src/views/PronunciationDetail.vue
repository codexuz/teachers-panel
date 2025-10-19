<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  pronunciationAPI,
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
  FileAudio,
  ArrowLeft,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  Upload,
  X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const isEditMode = ref(false)

// Upload states
const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref(null)
const fileInputKey = ref(0) // For resetting file input

// Data
const pronunciationExercise = ref(null)
const pronunciationItems = ref([])

// Form data
const pronunciationForm = reactive({
  id: null,
  speaking_id: "",
  word_to_pronunce: "",
  audio_url: "",
  audio_file: null
})

// Computed properties
const speakingId = computed(() => route.params.id)
const pronunciationTitle = computed(() => pronunciationExercise.value?.title || 'Pronunciation Exercise')
const pronunciationDescription = computed(() => pronunciationExercise.value?.description || '')

// Functions
const fetchData = async () => {
  if (!speakingId.value) return

  isLoading.value = true
  error.value = ''

  try {
    // Fetch the speaking exercise
    const response = await pronunciationAPI.getById(speakingId.value)
    pronunciationExercise.value = response
    
    // Fetch pronunciation items
    await fetchPronunciationItems()
  } catch (err) {
    console.error('Error fetching pronunciation data:', err)
    error.value = 'Failed to load pronunciation exercise'
  } finally {
    isLoading.value = false
  }
}

const fetchPronunciationItems = async () => {
  try {
    const response = await pronunciationAPI.getBySpeakingId(speakingId.value)
    pronunciationItems.value = response || []
  } catch (err) {
    console.error('Error fetching pronunciation items:', err)
    // Don't set error here, as it's a secondary fetch that shouldn't block the UI
  }
}

// Modal functions
const openModal = () => {
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (item) => {
  isEditMode.value = true
  Object.assign(pronunciationForm, item)
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  // Reset pronunciation form
  Object.assign(pronunciationForm, {
    id: null,
    speaking_id: "",
    word_to_pronunce: "",
    audio_url: "",
    audio_file: null
  })
  
  // Reset file input
  fileInputKey.value++
}

// Form submission
const submitForm = async () => {
  error.value = ''
  isLoading.value = true
  
  try {
    // Validate
    if (!pronunciationForm.word_to_pronunce.trim()) {
      error.value = 'Please enter a word to pronounce'
      return
    }
    
    // Handle file upload if needed
    let audioUrl = pronunciationForm.audio_url
    if (pronunciationForm.audio_file) {
      audioUrl = await uploadFile(pronunciationForm.audio_file)
    }
    
    const itemData = {
      speaking_id: pronunciationForm.speaking_id,
      word_to_pronunce: pronunciationForm.word_to_pronunce,
      audio_url: audioUrl
    }
    
    if (isEditMode.value) {
      await pronunciationAPI.update(pronunciationForm.id, itemData)
      
      // Update item in the list
      const index = pronunciationItems.value.findIndex(item => item.id === pronunciationForm.id)
      if (index !== -1) {
        pronunciationItems.value[index] = { ...pronunciationItems.value[index], ...itemData }
      }
    } else {
      const response = await pronunciationAPI.create(itemData)
      pronunciationItems.value.push(response)
    }
    
    closeModal()
  } catch (err) {
    console.error('Error submitting form:', err)
    error.value = 'Failed to save pronunciation item'
  } finally {
    isLoading.value = false
  }
}

// Delete functionality
const confirmDelete = (id) => {
  if (confirm('Are you sure you want to delete this pronunciation item?')) {
    deleteItem(id)
  }
}

const deleteItem = async (id) => {
  isLoading.value = true
  error.value = ''
  
  try {
    await pronunciationAPI.delete(id)
    pronunciationItems.value = pronunciationItems.value.filter(item => item.id !== id)
  } catch (err) {
    console.error('Error deleting item:', err)
    error.value = 'Failed to delete pronunciation item'
  } finally {
    isLoading.value = false
  }
}

// File upload helper
const handleFileChange = (event, field) => {
  const file = event.target.files[0]
  if (file) {
    pronunciationForm[field] = file
    // Clear URL if file is selected
    if (field === 'audio_file') {
      pronunciationForm.audio_url = ''
    }
  }
}

const removeFile = (field) => {
  pronunciationForm[field] = null
  fileInputKey.value++
}

const uploadFile = async (file) => {
  isUploading.value = true
  uploadProgress.value = 0
  
  try {
    const formData = new FormData()
    formData.append('file', file)    
    const response = await uploadAPI.uploadFile(formData, (progressEvent) => {
      uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    })
    
    return response.url
  } catch (err) {
    console.error('File upload error:', err)
    error.value = 'Failed to upload file'
    throw err
  } finally {
    isUploading.value = false
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Back Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" class="flex items-center gap-1" @click="router.back()">
          <ArrowLeft class="h-4 w-4" />
          Back
        </Button>
        <div class="space-y-1">
          <h1 class="text-3xl font-bold tracking-tight">{{ pronunciationTitle }}</h1>
          <p class="text-muted-foreground">{{ pronunciationDescription }}</p>
        </div>
      </div>
      
      <!-- Header Actions -->
      <Button @click="openModal" class="flex items-center gap-2">
        <Plus class="w-4 h-4" />
        Add Pronunciation Item
      </Button>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Pronunciation Items List -->
    <Card>
      <CardHeader>
        <CardTitle>Pronunciation Items</CardTitle>
        <CardDescription>Words and phrases students need to pronounce correctly</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="space-y-3">
          <Skeleton v-for="i in 3" :key="i" class="h-16 w-full" />
        </div>
        
        <div v-else-if="pronunciationItems.length === 0" class="text-center py-8">
          <Volume2 class="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <p class="text-lg font-medium text-gray-900">No pronunciation items</p>
          <p class="text-gray-600">Add your first pronunciation item.</p>
        </div>
        
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Word to Pronounce</TableHead>
              <TableHead>Audio</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in pronunciationItems" :key="item.id">
              <TableCell class="font-medium">{{ item.word_to_pronunce }}</TableCell>
              <TableCell>
                <Badge v-if="item.audio_url" variant="secondary">
                  <FileAudio class="w-3 h-3 mr-1" />
                  Audio Available
                </Badge>
                <span v-else class="text-muted-foreground">No audio</span>
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" class="h-8 w-8 p-0">
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openEditModal(item)">
                      <Edit class="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      @click="confirmDelete(item.id)"
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

    <!-- Add/Edit Pronunciation Item Modal -->
    <Dialog v-model:open="showModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Pronunciation Item' : 'Add Pronunciation Item' }}</DialogTitle>
          <DialogDescription>
            {{ isEditMode ? 'Update this pronunciation item.' : 'Add a new pronunciation item for students to practice.' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="submitForm" class="space-y-4">
          <div class="space-y-2">
            <Label for="word">Word to Pronounce *</Label>
            <Input
              id="word"
              v-model="pronunciationForm.word_to_pronunce"
              placeholder="Enter word to pronounce"
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label>Audio</Label>
            <div class="space-y-2">
              <!-- Audio URL Option -->
              <div class="space-y-2">
                <Label for="audio-url" class="text-sm text-muted-foreground">Audio URL</Label>
                <Input
                  id="audio-url"
                  v-model="pronunciationForm.audio_url"
                  placeholder="https://storage.example.com/audio/pronunciation.mp3"
                  type="url"
                  :disabled="!!pronunciationForm.audio_file"
                />
              </div>
              
              <!-- File Upload Option -->
              <div class="space-y-2">
                <Label for="audio-file" class="text-sm text-muted-foreground">Or Upload Audio File</Label>
                <div class="flex items-center gap-2">
                  <Input
                    :key="fileInputKey"
                    id="audio-file"
                    type="file"
                    accept="audio/*"
                    class="flex-1"
                    @change="(e) => handleFileChange(e, 'audio_file')"
                    :disabled="isUploading"
                  />
                  <Button 
                    v-if="pronunciationForm.audio_file" 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    @click="removeFile('audio_file')"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>
                
                <!-- Upload Progress -->
                <div v-if="isUploading" class="mt-2">
                  <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-blue-500 transition-all" 
                      :style="{ width: `${uploadProgress}%` }"
                    ></div>
                  </div>
                  <div class="text-xs text-right mt-1">{{ uploadProgress }}%</div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancel</Button>
            <Button type="submit" :disabled="isLoading || isUploading">
              <RefreshCw v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ isEditMode ? 'Update Item' : 'Add Item' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>

</template>
