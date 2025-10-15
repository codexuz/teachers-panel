<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vocabularyAPI, vocabularyItemsAPI, uploadAPI } from '@/utils/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, BookOpen, Volume2, Image as ImageIcon, Quote, List, Plus, Upload, Download, Play, CirclePause, Check, X, Loader2, Search, FileText, AlertCircle, Info } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Pexels API Key
const PEXELS_API_KEY = 'x9JPjTC9LmpxAkisngyQTO371TsvHiwnGeg9wX75RuXJFzJx5KfCn1bI'

// Reactive state
const vocabularyItems = ref([])
const vocabularySet = ref(null)
const loading = ref(true)
const submitting = ref(false)
const showModal = ref(false)
const showBulkModal = ref(false)
const editingItem = ref(null)
const searchQuery = ref('')
const filterType = ref('all')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const csvFile = ref(null)
const csvFileInput = ref(null)
const audioFile = ref(null)
const audioFileInput = ref(null)
const currentlyPlayingAudio = ref(null)
const playingAudioUrl = ref(null)
const audioValidationStatus = ref({})
const searchImages = ref([])
const isSearchingImages = ref(false)
const searchImagesError = ref(null)
const isUploadingAudio = ref(false)
const uploadAudioProgress = ref(0)

// Form data
const itemForm = ref({
  word: '',
  uzbek: '',
  rus: '',
  example: '',
  audio_url: '',
  image_url: '',
  set_id: null
})

// Get set ID from route params
const set_id = computed(() => route.params.id)

// Computed properties
const filteredItems = computed(() => {
  let filtered = vocabularyItems.value.filter(item => {
    const matchesSearch = !searchQuery.value ||
      item.word?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.uzbek || item.uzbekTranslation)?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.rus || item.russianTranslation)?.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesFilter = filterType.value === 'all' ||
      (filterType.value === 'with-audio' && item.audio_url) ||
      (filterType.value === 'with-images' && item.image_url) ||
      (filterType.value === 'with-examples' && item.example)

    return matchesSearch && matchesFilter
  })

  return filtered
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredItems.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / itemsPerPage.value)
})

const stats = computed(() => {
  const total = vocabularyItems.value.length
  const withAudio = vocabularyItems.value.filter(item => item.audio_url).length
  const withImages = vocabularyItems.value.filter(item => item.image_url).length
  const withExamples = vocabularyItems.value.filter(item => item.example).length

  return { total, withAudio, withImages, withExamples }
})

// API methods
const loadVocabularySet = async () => {
  try {
    if (set_id.value) {
      const data = await vocabularyAPI.getById(set_id.value)
      vocabularySet.value = data
    }
  } catch (error) {
    console.error('Error loading vocabulary set:', error)
  }
}

const loadVocabularyItems = async () => {
  try {
    loading.value = true
    if (set_id.value) {
      const data = await vocabularyItemsAPI.getBySetId(set_id.value)
      vocabularyItems.value = Array.isArray(data) ? data : []
    } else {
      const data = await vocabularyItemsAPI.getAll()
      vocabularyItems.value = Array.isArray(data) ? data : []
    }
  } catch (error) {
    console.error('Error loading vocabulary items:', error)
    vocabularyItems.value = []
  } finally {
    loading.value = false
  }
}

// Modal methods
const openModal = () => {
  editingItem.value = null
  itemForm.value = {
    word: '',
    uzbek: '',
    rus: '',
    example: '',
    audio_url: '',
    image_url: '',
    set_id: set_id.value
  }
  showModal.value = true
}

const editVocabularyItem = (item) => {
  editingItem.value = item
  itemForm.value = {
    word: item.word || '',
    uzbek: item.uzbek || item.uzbekTranslation || '',
    rus: item.rus || item.russianTranslation || '',
    example: item.example || '',
    audio_url: item.audio_url || '',
    image_url: item.image_url || '',
    set_id: item.set_id || set_id.value
  }
  showModal.value = true
}

const closeModal = async () => {
  try {
    // Close modal first
    showModal.value = false
    editingItem.value = null
  } catch (error) {
    console.error('Error closing modal:', error)
  }
}

const submitVocabularyItem = async () => {
  try {
    submitting.value = true

    // Log the data being sent for debugging
    console.log('Submitting vocabulary item:', itemForm.value)

    if (editingItem.value) {
      console.log('Updating item with ID:', editingItem.value.id)
      await vocabularyItemsAPI.update(editingItem.value.id, itemForm.value)
    } else {
      console.log('Creating new item')
      await vocabularyItemsAPI.create(itemForm.value)
    }

    await loadVocabularyItems()
    closeModal()
    console.log('Vocabulary item saved successfully')
  } catch (error) {
    console.error('Error saving vocabulary item:', error)
    alert(`Error saving vocabulary item: ${error.message}`)
  } finally {
    submitting.value = false
  }
}

const deleteVocabularyItem = async (item) => {
  if (confirm(`Are you sure you want to delete "${item.word}"?`)) {
    try {
      await vocabularyItemsAPI.delete(item.id)
      await loadVocabularyItems()
    } catch (error) {
      console.error('Error deleting vocabulary item:', error)
    }
  }
}

// Pexels API - Search for images related to a word
const searchImagesForWord = async (word) => {
  if (!word) {
    searchImagesError.value = 'Please enter a word to search for images'
    return
  }
  
  try {
    searchImagesError.value = null
    isSearchingImages.value = true
    searchImages.value = []
    
    // Search Pexels for images related to the word using fetch API
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=10`, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.photos && data.photos.length > 0) {
      searchImages.value = data.photos.map(photo => ({
        id: photo.id,
        url: photo.src.medium,
        alt: photo.alt || word,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url
      }))
    } else {
      searchImagesError.value = `No images found for "${word}"`
    }
  } catch (error) {
    console.error('Error searching for images:', error)
    searchImagesError.value = `Error searching for images: ${error.message || 'Unknown error'}`
  } finally {
    isSearchingImages.value = false
  }
}

// Select an image from search results
const selectImage = (image) => {
  if (image && image.url) {
    itemForm.value.image_url = image.url
  }
}

// Navigation
const goBackToSets = () => {
  router.push('/vocabulary')
}

// Audio playback
const playAudio = (audioUrl) => {
  if (!audioUrl) return

  // If the same audio is already playing, stop it
  if (playingAudioUrl.value === audioUrl && currentlyPlayingAudio.value) {
    currentlyPlayingAudio.value.pause()
    currentlyPlayingAudio.value.currentTime = 0
    currentlyPlayingAudio.value = null
    playingAudioUrl.value = null
    return
  }

  // Stop any currently playing audio
  if (currentlyPlayingAudio.value) {
    currentlyPlayingAudio.value.pause()
    currentlyPlayingAudio.value.currentTime = 0
  }

  try {
    const audio = new Audio(audioUrl)
    currentlyPlayingAudio.value = audio
    playingAudioUrl.value = audioUrl

    audio.addEventListener('ended', () => {
      currentlyPlayingAudio.value = null
      playingAudioUrl.value = null
    })

    audio.addEventListener('error', (e) => {
      console.error('Error playing audio:', e)
      alert('Error playing audio. Please check the audio URL.')
      currentlyPlayingAudio.value = null
      playingAudioUrl.value = null
    })

    audio.play().catch(error => {
      console.error('Error playing audio:', error)
      alert('Error playing audio. Please check the audio URL.')
      currentlyPlayingAudio.value = null
      playingAudioUrl.value = null
    })
  } catch (error) {
    console.error('Error creating audio:', error)
    alert('Error playing audio. Please check the audio URL.')
  }
}

// Audio URL validation
const validateAudioUrl = async (url) => {
  if (!url) {
    audioValidationStatus.value[url] = null
    return
  }

  audioValidationStatus.value[url] = 'checking'

  try {
    const audio = new Audio()

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        audioValidationStatus.value[url] = 'error'
        resolve(false)
      }, 5000) // 5 second timeout

      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout)
        audioValidationStatus.value[url] = 'valid'
        resolve(true)
      })

      audio.addEventListener('error', () => {
        clearTimeout(timeout)
        audioValidationStatus.value[url] = 'error'
        resolve(false)
      })

      audio.src = url
    })
  } catch (error) {
    audioValidationStatus.value[url] = 'error'
    return false
  }
}

// Upload audio file
const uploadAudioFile = async (file) => {
  if (!file) {
    alert('Please select an audio file first')
    return
  }

  // Validate file type
  const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac']
  if (!validAudioTypes.includes(file.type)) {
    alert('Please select a valid audio file (MP3, WAV, OGG, M4A, or AAC)')
    return
  }

  // Validate file size (10MB max)
  const maxSizeInBytes = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSizeInBytes) {
    alert(`File size exceeds 10MB. Please select a smaller file.`)
    return
  }

  try {
    isUploadingAudio.value = true
    uploadAudioProgress.value = 0

    // Use the uploadAPI with progress tracking
    const result = await uploadAPI.uploadFile(file, {
      onUploadProgress: (event) => {
        if (event.lengthComputable) {
          uploadAudioProgress.value = Math.round((event.loaded / event.total) * 100)
        }
      }
    })
    
    // Get the URL from response and set it to the audio_url field
    if (result && result.url) {
      itemForm.value.audio_url = result.url
      validateAudioUrl(result.url)
      console.log('Audio file uploaded successfully:', result.url)
    } else {
      throw new Error('Uploaded file URL not received from server')
    }
    
    // Get the URL from response and set it to the audio_url field
    if (result && result.url) {
      itemForm.value.audio_url = result.url
      validateAudioUrl(result.url)
      console.log('Audio file uploaded successfully:', result.url)
    } else {
      throw new Error('Uploaded file URL not received from server')
    }
    
  } catch (error) {
    console.error('Error uploading audio file:', error)
    alert(`Error uploading audio file: ${error.message || 'Unknown error'}`)
  } finally {
    isUploadingAudio.value = false
    uploadAudioProgress.value = 0
    audioFile.value = null
    if (audioFileInput.value) {
      audioFileInput.value.value = ''
    }
  }
}

// Handle audio file input change
const handleAudioFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    audioFile.value = file
    uploadAudioFile(file)
  }
}

const API_BASE_URL = "https://backend.impulselc.uz/api"

// Generate Oxford dictionary audio URL
const generateOxfordAudio = (word) => {
  if (!word || !word.trim()) {
    alert('Please enter a word first')
    return
  }

  try {
    const cleanWord = word.trim().toLowerCase().replace(/[^a-z]/g, '')
    const audioUrl = `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${cleanWord}--_gb_1.mp3`

    // Test if the audio URL works
    const audio = new Audio()
    audio.addEventListener('canplaythrough', () => {
      itemForm.value.audio_url = audioUrl
      validateAudioUrl(audioUrl)
      console.log('Oxford Audio URL generated successfully:', audioUrl)
    })
    audio.addEventListener('error', () => {
      console.log('Oxford audio not available for this word, trying TTS instead...')
      generateTTSAudio(word)
    })
    audio.src = audioUrl
  } catch (error) {
    console.error('Error generating Oxford audio URL:', error)
    alert('Error generating Oxford audio URL')
  }
}

const closeBulkModal = () => {
  showBulkModal.value = false
  csvFile.value = null
  if (csvFileInput.value) {
    csvFileInput.value.value = ''
  }
}

// CSV Export/Import functions
const exportToCSV = () => {
  if (vocabularyItems.value.length === 0) {
    alert('No vocabulary items to export')
    return
  }

  const headers = ['word', 'uzbek', 'rus', 'example', 'audio_url', 'image_url']
  const csvContent = [
    headers.join(','),
    ...vocabularyItems.value.map(item =>
      headers.map(header => {
        let value = ''
        // Handle different field name variations from API
        if (header === 'uzbek') {
          value = item.uzbek || item.uzbekTranslation || ''
        } else if (header === 'rus') {
          value = item.rus || item.russianTranslation || ''
        } else {
          value = item[header] || ''
        }
        // Escape quotes and wrap in quotes if contains comma or quote
        return value.includes(',') || value.includes('"')
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `vocabulary_${vocabularySet.value?.title || 'items'}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    csvFile.value = file
  }
}

const handleFileDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please drop a CSV file')
      return
    }
    csvFile.value = file
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Simple CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
  const requiredHeaders = ['word']
  const optionalHeaders = ['uzbek', 'rus', 'example', 'audio_url', 'image_url']

  // Check if required headers exist
  const missingRequired = requiredHeaders.filter(header => !headers.includes(header))
  if (missingRequired.length > 0) {
    throw new Error(`Missing required columns: ${missingRequired.join(', ')}`)
  }

  const items = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const item = { set_id: set_id.value }

    headers.forEach((header, index) => {
      if (requiredHeaders.includes(header) || optionalHeaders.includes(header)) {
        item[header] = values[index] || ''
      }
    })

    if (item.word && item.word.trim()) { // Only add items with a word
      items.push(item)
    }
  }

  return items
}

const importCSV = async () => {
  if (!csvFile.value) {
    alert('Please select a CSV file first')
    return
  }

  try {
    loading.value = true
    const text = await csvFile.value.text()
    const items = parseCSV(text)

    if (items.length === 0) {
      alert('No valid vocabulary items found in CSV file')
      return
    }

    // Track success and failure counts
    let successCount = 0
    let failureCount = 0
    
    // Create items one by one instead of using bulk import
    for (const item of items) {
      try {
        // Ensure set_id is properly set
        item.set_id = set_id.value
        
        // Create vocabulary item
        await vocabularyItemsAPI.create(item)
        successCount++
      } catch (itemError) {
        console.error('Error creating vocabulary item:', itemError, item)
        failureCount++
      }
      
      // Update progress (optional)
      if ((successCount + failureCount) % 5 === 0) {
        console.log(`Import progress: ${successCount + failureCount}/${items.length}`)
      }
    }

    // Reload the vocabulary items
    await loadVocabularyItems()

    // Close modal and reset file
    closeBulkModal()

    if (failureCount > 0) {
      alert(`Import completed with ${successCount} items imported successfully and ${failureCount} failed items.`)
    } else {
      alert(`Successfully imported ${successCount} vocabulary items`)
    }
  } catch (error) {
    console.error('Error importing CSV:', error)
    alert(`Error importing CSV: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const downloadSampleCSV = () => {
  const sampleData = [
    ['word', 'uzbek', 'rus', 'example', 'audio_url', 'image_url'],
    ['hello', 'salom', 'привет', 'Hello, how are you?', '', ''],
    ['book', 'kitob', 'книга', 'I am reading a book.', '', ''],
    ['water', 'suv', 'вода', 'Please give me some water.', '', '']
  ]

  const csvContent = sampleData.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'vocabulary_sample_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Pagination methods
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

// Watchers
watch(searchQuery, () => {
  currentPage.value = 1
})

watch(filterType, () => {
  currentPage.value = 1
})

// Watch for audio URL changes in form with debounce
let audioValidationTimeout = null
watch(() => itemForm.value.audio_url, (newUrl) => {
  if (audioValidationTimeout) {
    clearTimeout(audioValidationTimeout)
  }

  if (newUrl && newUrl.trim()) {
    audioValidationTimeout = setTimeout(() => {
      validateAudioUrl(newUrl.trim())
    }, 1000)
  }
})

// Watch for changes in the word field to suggest auto-search
watch(() => itemForm.value.word, (newWord, oldWord) => {
  // Only show a suggestion when creating a new item (not when editing)
  // and only when the word changes substantially
  if (newWord && !editingItem.value && (!oldWord || oldWord.length < 2) && newWord.length >= 2) {
    // Reset any previous search results
    searchImages.value = []
    searchImagesError.value = null
    
    // Set a small notification that images can be searched
    searchImagesError.value = `You can search for images related to "${newWord}"`
  }
})

// Initialize
onMounted(() => {
  loadVocabularySet()
  loadVocabularyItems()
  
  // Check if Pexels API key is available
  if (!PEXELS_API_KEY) {
    console.error('Pexels API key is missing. Image search functionality may not work.')
  }
})

// Cleanup
onUnmounted(() => {
  if (currentlyPlayingAudio.value) {
    currentlyPlayingAudio.value.pause()
    currentlyPlayingAudio.value = null
    playingAudioUrl.value = null
  }
})
</script>

<template>
  <!-- Vocabulary Items Management -->
  <div id="vocabulary-items" class="content-page">
    <div class="mb-6">
      <div class="flex items-center space-x-4 mb-4">
        <Button variant="ghost" @click="goBackToSets" class="gap-2">
          <ArrowLeft class="h-4 w-4" />
          Back to Vocabulary Sets
        </Button>
      </div>
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold">{{ vocabularySet?.title || 'Vocabulary Items' }}</h2>
          <p class="text-muted-foreground">{{ vocabularySet?.description || 'Manage vocabulary items' }}</p>
        </div>
        <div class="flex gap-2">
          <Button @click="showBulkModal = true" variant="outline" class="gap-2">
            <Upload class="h-4 w-4" />
            Bulk Import
          </Button>
          <Button @click="openModal" class="gap-2">
            <Plus class="h-4 w-4" />
            Add Word
          </Button>
        </div>
      </div>
    </div>

    <!-- Stats for Current Set -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
              <List class="h-5 w-5 text-primary" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">Total Words</p>
              <p class="text-2xl font-bold">{{ stats.total }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-green-500/10 dark:bg-green-500/20">
              <Volume2 class="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">With Audio</p>
              <p class="text-2xl font-bold">{{ stats.withAudio }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-500/10 dark:bg-purple-500/20">
              <ImageIcon class="h-5 w-5 text-purple-600 dark:text-purple-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">With Images</p>
              <p class="text-2xl font-bold">{{ stats.withImages }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20">
              <Quote class="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">With Examples</p>
              <p class="text-2xl font-bold">{{ stats.withExamples }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search and Filter -->
    <Card class="mb-6">
      <CardContent class="p-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search vocabulary items..."
            />
          </div>
          <Select v-model="filterType">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Filter items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="with-audio">With Audio</SelectItem>
              <SelectItem value="with-images">With Images</SelectItem>
              <SelectItem value="with-examples">With Examples</SelectItem>
            </SelectContent>
          </Select>
          <Button @click="exportToCSV" variant="destructive" class="gap-2">
            <Download class="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Vocabulary Items List -->
    <Card>
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <Loader2 class="h-12 w-12 animate-spin text-primary" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredItems.length === 0" class="text-center py-12">
        <div class="text-muted-foreground mb-4">
          <BookOpen class="h-16 w-16 mx-auto" />
        </div>
        <h3 class="text-lg font-medium mb-2">No vocabulary items found</h3>
        <p class="text-muted-foreground">{{ searchQuery ? 'Try adjusting your search criteria' : 'Add your first vocabulary item to get started' }}</p>
      </div>

      <!-- Items List -->
      <div v-else class="divide-y">
        <div
          v-for="item in paginatedItems"
          :key="item.id"
          class="p-6 hover:bg-muted/50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center flex-1">
              <div class="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mr-4">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.word"
                  class="w-12 h-12 rounded object-cover"
                >
                <FileText v-else class="h-6 w-6 text-muted-foreground" />
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-4">
                  <div>
                    <h3 class="text-lg font-semibold">{{ item.word || 'Unknown' }}</h3>
                    <div class="flex items-center gap-4 text-sm text-muted-foreground">
                      <span v-if="item.uzbek || item.uzbekTranslation">
                        UZ: {{ item.uzbek || item.uzbekTranslation }}
                      </span>
                      <span v-if="item.rus || item.russianTranslation">
                        RU: {{ item.rus || item.russianTranslation }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button
                      v-if="item.audio_url"
                      :variant="playingAudioUrl === item.audio_url ? 'default' : 'outline'"
                      size="icon"
                      @click="playAudio(item.audio_url)"
                      :title="playingAudioUrl === item.audio_url ? 'Stop audio' : 'Play audio for ' + item.word"
                    >
                      <Stop v-if="playingAudioUrl === item.audio_url" class="h-4 w-4" />
                      <Volume2 v-else class="h-4 w-4" />
                    </Button>
                    <Badge v-if="item.audio_url" :variant="playingAudioUrl === item.audio_url ? 'default' : 'secondary'">
                      {{ playingAudioUrl === item.audio_url ? 'Playing...' : 'Has Audio' }}
                    </Badge>
                    <Badge v-else variant="outline">No Audio</Badge>

                    <Badge v-if="item.image_url" variant="secondary">Has Image</Badge>
                    <Badge v-else variant="outline">No Image</Badge>
                  </div>
                </div>
                <p v-if="item.example" class="text-sm text-muted-foreground mt-2 flex items-start gap-1">
                  <Quote class="h-3 w-3 mt-0.5" />
                  "{{ item.example }}"
                </p>
              </div>
            </div>
            <div class="flex gap-2 ml-4">
              <Button
                @click="editVocabularyItem(item)"
                size="sm"
                class="gap-1"
              >
                Edit
              </Button>
              <Button
                @click="deleteVocabularyItem(item)"
                variant="destructive"
                size="sm"
                class="gap-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && filteredItems.length > 0" class="px-6 py-4 border-t">
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} of {{ filteredItems.length }} vocabulary items
          </div>
          <div class="flex gap-2">
            <Button
              @click="previousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
            >
              Previous
            </Button>

            <Button
              v-for="page in Math.min(5, totalPages)"
              :key="page"
              @click="goToPage(page)"
              :variant="page === currentPage ? 'default' : 'outline'"
              size="sm"
            >
              {{ page }}
            </Button>

            <Button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <!-- Add Vocabulary Item Modal -->
    <Dialog :open="showModal" @update:open="(open) => !open && closeModal()">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingItem ? 'Edit Vocabulary Item' : 'Add Vocabulary Item' }}
          </DialogTitle>
        </DialogHeader>
        <form @submit.prevent="submitVocabularyItem" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>English Word *</Label>
              <Input
                v-model="itemForm.word"
                type="text"
                required
                placeholder="Enter English word"
              />
            </div>
            <div>
              <Label>Uzbek Translation</Label>
              <Input
                v-model="itemForm.uzbek"
                type="text"
                placeholder="Enter Uzbek translation"
              />
            </div>
          </div>

          <div>
            <Label>Russian Translation</Label>
            <Input
              v-model="itemForm.rus"
              type="text"
              placeholder="Enter Russian translation"
            />
          </div>

          <div>
            <Label>Example Sentence</Label>
            <Textarea
              v-model="itemForm.example"
              rows="3"
              placeholder="Enter an example sentence using this word"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label>Audio URL</Label>
              <div class="space-y-2">
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <Input
                      v-model="itemForm.audio_url"
                      type="url"
                      :class="[
                        audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'border-green-500' :
                        audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'border-destructive' : ''
                      ]"
                      placeholder="Enter audio file URL"
                    />
                    <div v-if="itemForm.audio_url?.trim()" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 v-if="audioValidationStatus[itemForm.audio_url.trim()] === 'checking'" class="h-4 w-4 animate-spin text-muted-foreground" />
                      <Check v-else-if="audioValidationStatus[itemForm.audio_url.trim()] === 'valid'" class="h-4 w-4 text-green-500" />
                      <X v-else-if="audioValidationStatus[itemForm.audio_url.trim()] === 'error'" class="h-4 w-4 text-destructive" />
                    </div>
                  </div>
                  <Button
                    v-if="itemForm.audio_url"
                    type="button"
                    @click="playAudio(itemForm.audio_url)"
                    :variant="playingAudioUrl === itemForm.audio_url ? 'destructive' : 'default'"
                    size="icon"
                    :title="playingAudioUrl === itemForm.audio_url ? 'Stop audio' : 'Test audio'"
                  >
                    <Stop v-if="playingAudioUrl === itemForm.audio_url" class="h-4 w-4" />
                    <Play v-else class="h-4 w-4" />
                  </Button>
                </div>

                <!-- Audio controls -->
                <div class="flex gap-2">
                  <Button
                    type="button"
                    @click="generateOxfordAudio(itemForm.word)"
                    :disabled="!itemForm.word?.trim()"
                    variant="outline"
                    size="sm"
                    class="flex-1 gap-1"
                    title="Generate Oxford Dictionary audio"
                  >
                    <BookOpen class="h-4 w-4" />
                    Oxford Audio
                  </Button>
                  
                  <label 
                    class="flex-1"
                    :class="{ 'opacity-70 pointer-events-none': isUploadingAudio }"
                  >
                    <input 
                      type="file"
                      ref="audioFileInput"
                      @change="handleAudioFileChange"
                      accept="audio/*"
                      class="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="w-full gap-1"
                      :disabled="isUploadingAudio"
                      as-child
                    >
                      <span>
                        <Loader2 v-if="isUploadingAudio" class="h-4 w-4 animate-spin" />
                        <Upload v-else class="h-4 w-4" />
                        {{ isUploadingAudio ? `Uploading ${uploadAudioProgress}%` : 'Upload Audio' }}
                      </span>
                    </Button>
                  </label>
                </div>
                
                <!-- Upload progress bar -->
                <div v-if="isUploadingAudio">
                  <Progress :model-value="uploadAudioProgress" class="h-1.5" />
                </div>
                
                <!-- Audio file format note -->
                <Alert>
                  <Info class="h-4 w-4" />
                  <AlertDescription class="text-xs">
                    Supported audio formats: MP3, WAV, OGG, M4A, and AAC. Max file size: 10MB.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div class="space-y-2">
              <Label>Image URL</Label>
              <div class="flex gap-2">
                <Input
                  v-model="itemForm.image_url"
                  type="url"
                  class="flex-1"
                  placeholder="Enter image URL"
                />
                <Button
                  type="button"
                  @click="searchImagesForWord(itemForm.word)"
                  :disabled="isSearchingImages || !itemForm.word"
                  size="icon"
                >
                  <Loader2 v-if="isSearchingImages" class="h-4 w-4 animate-spin" />
                  <Search v-else class="h-4 w-4" />
                </Button>
              </div>
              
              <!-- Image search results -->
              <div v-if="searchImages.length > 0" class="mt-4 space-y-2">
                <h5 class="text-sm font-medium">Select an image from Pexels:</h5>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div 
                    v-for="image in searchImages" 
                    :key="image.id"
                    @click="selectImage(image)"
                    class="cursor-pointer border rounded-md overflow-hidden hover:border-primary"
                    :class="{ 'ring-2 ring-primary': itemForm.image_url === image.url }"
                  >
                    <img :src="image.url" :alt="image.alt" class="w-full h-24 object-cover" />
                  </div>
                </div>
                <p class="text-xs text-muted-foreground">
                  Photos provided by <a href="https://www.pexels.com" target="_blank" class="text-primary hover:underline">Pexels</a>
                </p>
              </div>
              
              <Alert v-if="searchImagesError" variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <AlertDescription class="text-xs">
                  {{ searchImagesError }}
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Card class="bg-muted/50">
            <CardHeader>
              <CardTitle class="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm">
              <p><strong>Word:</strong> {{ itemForm.word || '-' }}</p>
              <p><strong>Translations:</strong>
                <span v-if="itemForm.uzbek || itemForm.rus">
                  {{ [itemForm.uzbek, itemForm.rus].filter(Boolean).join(', ') }}
                </span>
                <span v-else>-</span>
              </p>
              <p><strong>Example:</strong> {{ itemForm.example || '-' }}</p>

              <!-- Audio Preview -->
              <div v-if="itemForm.audio_url" class="flex items-center gap-2">
                <strong>Audio:</strong>
                <Button
                  type="button"
                  @click="playAudio(itemForm.audio_url)"
                  :variant="playingAudioUrl === itemForm.audio_url ? 'destructive' : 'default'"
                  size="sm"
                >
                  <Stop v-if="playingAudioUrl === itemForm.audio_url" class="h-3 w-3 mr-1" />
                  <Play v-else class="h-3 w-3 mr-1" />
                  {{ playingAudioUrl === itemForm.audio_url ? 'Stop' : 'Play' }}
                </Button>
                <Badge :variant="
                  audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'default' :
                  audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'destructive' : 'secondary'
                ">
                  {{ audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'Valid' :
                     audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'Invalid' :
                     audioValidationStatus[itemForm.audio_url?.trim()] === 'checking' ? 'Checking...' : 'Not checked' }}
                </Badge>
              </div>

              <!-- Image Preview -->
              <div v-if="itemForm.image_url" class="flex items-center gap-2">
                <strong>Image:</strong>
                <img
                  :src="itemForm.image_url"
                  :alt="itemForm.word || 'Preview'"
                  class="w-16 h-16 object-cover rounded border-2 shadow-sm"
                  @load="() => console.log('Preview section image loaded successfully')"
                  @error="(e) => { console.log('Preview section image failed to load:', itemForm.image_url); e.target.style.display = 'none'; }"
                >
                <Badge variant="secondary">Available</Badge>
              </div>
            </CardContent>
          </Card>
        </form>
        <DialogFooter>
          <Button
            @click="closeModal"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            @click="submitVocabularyItem"
            :disabled="submitting"
          >
            <Loader2 v-if="submitting" class="h-4 w-4 mr-2 animate-spin" />
            {{ submitting ? 'Saving...' : (editingItem ? 'Update Word' : 'Add Word') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Bulk Import Modal -->
    <Dialog :open="showBulkModal" @update:open="(open) => !open && closeBulkModal()">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Vocabulary</DialogTitle>
        </DialogHeader>
        <div class="space-y-6">
          <div>
            <Label>CSV File</Label>
            <div
              class="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors mt-2"
              @drop="handleFileDrop"
              @dragover="handleDragOver"
              @dragenter.prevent
            >
              <Upload class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p class="text-muted-foreground mb-2">Drag and drop your CSV file here, or click to select</p>
              <p v-if="csvFile" class="text-sm text-green-600 mb-2 flex items-center justify-center gap-1">
                <FileText class="h-4 w-4" />{{ csvFile.name }}
              </p>
              <input
                type="file"
                accept=".csv"
                class="hidden"
                ref="csvFileInput"
                @change="handleFileSelect"
              >
              <Button
                type="button"
                @click="csvFileInput?.click()"
                variant="outline"
              >
                {{ csvFile ? 'Change File' : 'Select CSV File' }}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              <h4 class="font-medium mb-2">CSV Format Requirements</h4>
              <div class="text-sm space-y-2">
                <p>Your CSV file should have the following columns:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>word</strong> - English word (required)</li>
                  <li><strong>uzbek</strong> - Uzbek translation</li>
                  <li><strong>rus</strong> - Russian translation</li>
                  <li><strong>example</strong> - Example sentence</li>
                  <li><strong>audio_url</strong> - URL to audio file</li>
                  <li><strong>image_url</strong> - URL to image file</li>
                </ul>
                <p>
                  <a
                    href="#"
                    @click.prevent="downloadSampleCSV"
                    class="text-primary hover:underline">
                    Download sample CSV template
                  </a>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button
            @click="closeBulkModal"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            @click="importCSV"
            :disabled="!csvFile || loading"
            class="gap-2"
          >
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            {{ loading ? 'Importing...' : 'Import CSV' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
