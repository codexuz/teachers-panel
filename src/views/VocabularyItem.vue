<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vocabularyAPI, vocabularyItemsAPI } from '@/utils/api.js'

const route = useRoute()
const router = useRouter()

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
const currentlyPlayingAudio = ref(null)
const playingAudioUrl = ref(null)
const audioValidationStatus = ref({})

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

// Auto-generate TTS audio URL function
const generateTTSAudio = async (word) => {
  if (!word || !word.trim()) {
    alert('Please enter a word first')
    return
  }

  try {
    const encodedWord = encodeURIComponent(word.trim())
    const audioUrl = `https://impulselc.uz/api/v1/tts?lang=en-au&text=${encodedWord}`

    // Test if the audio URL works
    const audio = new Audio()
    audio.addEventListener('canplaythrough', () => {
      itemForm.value.audio_url = audioUrl
      validateAudioUrl(audioUrl)
      console.log('TTS Audio URL generated successfully:', audioUrl)
    })
    audio.addEventListener('error', () => {
      alert('Failed to generate TTS audio. Please try again or enter a different word.')
    })
    audio.src = audioUrl
  } catch (error) {
    console.error('Error generating TTS audio URL:', error)
    alert('Error generating TTS audio URL')
  }
}

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

    // Import items using bulk import API
    await vocabularyItemsAPI.bulkImport(set_id.value, items)

    // Reload the vocabulary items
    await loadVocabularyItems()

    // Close modal and reset file
    closeBulkModal()

    alert(`Successfully imported ${items.length} vocabulary items`)
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

// Initialize
onMounted(() => {
  loadVocabularySet()
  loadVocabularyItems()
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
        <button @click="goBackToSets" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-arrow-left mr-2"></i>Back to Vocabulary Sets
        </button>
      </div>
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">{{ vocabularySet?.title || 'Vocabulary Items' }}</h2>
          <p class="text-gray-600">{{ vocabularySet?.description || 'Manage vocabulary items' }}</p>
        </div>
        <div class="flex space-x-2">
          <button @click="showBulkModal = true" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <i class="fas fa-upload mr-2"></i>Bulk Import
          </button>
          <button @click="openModal" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <i class="fas fa-plus mr-2"></i>Add Word
          </button>
        </div>
      </div>
    </div>

    <!-- Stats for Current Set -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg card-shadow">
        <div class="flex items-center">
          <div class="p-3 bg-blue-500 rounded-full">
            <i class="fas fa-list text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">Total Words</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.total }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg card-shadow">
        <div class="flex items-center">
          <div class="p-3 bg-green-500 rounded-full">
            <i class="fas fa-volume-up text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">With Audio</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.withAudio }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg card-shadow">
        <div class="flex items-center">
          <div class="p-3 bg-purple-500 rounded-full">
            <i class="fas fa-image text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">With Images</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.withImages }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg card-shadow">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-500 rounded-full">
            <i class="fas fa-quote-right text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">With Examples</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.withExamples }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="bg-white rounded-lg card-shadow mb-6">
      <div class="p-6 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search vocabulary items..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <select
            v-model="filterType"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Items</option>
            <option value="with-audio">With Audio</option>
            <option value="with-images">With Images</option>
            <option value="with-examples">With Examples</option>
          </select>
          <button
            @click="exportToCSV"
            class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            <i class="fas fa-download mr-2"></i>Export CSV
          </button>
        </div>
      </div>
    </div>

    <!-- Vocabulary Items List -->
    <div class="bg-white rounded-lg card-shadow">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredItems.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <i class="fas fa-book-open text-6xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No vocabulary items found</h3>
        <p class="text-gray-500">{{ searchQuery ? 'Try adjusting your search criteria' : 'Add your first vocabulary item to get started' }}</p>
      </div>

      <!-- Items List -->
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="item in paginatedItems"
          :key="item.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center flex-1">
              <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.word"
                  class="w-12 h-12 rounded object-cover"
                >
                <i v-else class="fas fa-font text-gray-400 text-2xl"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center space-x-4">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-800">{{ item.word || 'Unknown' }}</h3>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                      <span v-if="item.uzbek || item.uzbekTranslation">
                        <i class="fas fa-flag mr-1"></i>UZ: {{ item.uzbek || item.uzbekTranslation }}
                      </span>
                      <span v-if="item.rus || item.russianTranslation">
                        <i class="fas fa-flag mr-1"></i>RU: {{ item.rus || item.russianTranslation }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      v-if="item.audio_url"
                      :class="[
                        'p-2 rounded-full transition-colors',
                        playingAudioUrl === item.audio_url
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-blue-600 hover:bg-blue-50'
                      ]"
                      @click="playAudio(item.audio_url)"
                      :title="playingAudioUrl === item.audio_url ? 'Stop audio' : 'Play audio for ' + item.word"
                    >
                      <i :class="playingAudioUrl === item.audio_url ? 'fas fa-stop' : 'fas fa-volume-up'"></i>
                    </button>
                    <span v-if="item.audio_url" :class="[
                      'px-2 py-1 text-xs rounded-full',
                      playingAudioUrl === item.audio_url
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-green-100 text-green-800'
                    ]">
                      {{ playingAudioUrl === item.audio_url ? 'Playing...' : 'Has Audio' }}
                    </span>
                    <span v-else class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No Audio</span>

                    <span v-if="item.image_url" class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Has Image</span>
                    <span v-else class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">No Image</span>
                  </div>
                </div>
                <p v-if="item.example" class="text-sm text-gray-500 mt-2">
                  <i class="fas fa-quote-left mr-1"></i>
                  "{{ item.example }}"
                </p>
              </div>
            </div>
            <div class="flex space-x-2 ml-4">
              <button
                @click="editVocabularyItem(item)"
                class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <i class="fas fa-edit mr-1"></i>Edit
              </button>
              <button
                @click="deleteVocabularyItem(item)"
                class="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 text-sm"
              >
                <i class="fas fa-trash mr-1"></i>Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && filteredItems.length > 0" class="px-6 py-4 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} of {{ filteredItems.length }} vocabulary items
          </div>
          <div class="flex space-x-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              v-for="page in Math.min(5, totalPages)"
              :key="page"
              @click="goToPage(page)"
              :class="page === currentPage ? 'px-3 py-1 bg-blue-600 text-white rounded-md text-sm' : 'px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50'"
            >
              {{ page }}
            </button>

            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Vocabulary Item Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto mx-4">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">
            {{ editingItem ? 'Edit Vocabulary Item' : 'Add Vocabulary Item' }}
          </h3>
        </div>
        <div class="p-6">
          <form @submit.prevent="submitVocabularyItem" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">English Word *</label>
                <input
                  v-model="itemForm.word"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter English word">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Uzbek Translation</label>
                <input
                  v-model="itemForm.uzbek"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Uzbek translation">
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Russian Translation</label>
              <input
                v-model="itemForm.rus"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Russian translation">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Example Sentence</label>
              <textarea
                v-model="itemForm.example"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Enter an example sentence using this word">
              </textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Audio URL</label>
                <div class="space-y-2">
                  <div class="flex space-x-2">
                    <div class="flex-1 relative">
                      <input
                        v-model="itemForm.audio_url"
                        type="url"
                        :class="[
                          'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2',
                          audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'border-green-300 focus:ring-green-500' :
                          audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'border-red-300 focus:ring-red-500' :
                          'border-gray-300 focus:ring-blue-500'
                        ]"
                        placeholder="Enter audio file URL">
                      <div v-if="itemForm.audio_url?.trim()" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <i v-if="audioValidationStatus[itemForm.audio_url.trim()] === 'checking'" class="fas fa-spinner fa-spin text-gray-400 text-sm"></i>
                        <i v-else-if="audioValidationStatus[itemForm.audio_url.trim()] === 'valid'" class="fas fa-check text-green-500 text-sm"></i>
                        <i v-else-if="audioValidationStatus[itemForm.audio_url.trim()] === 'error'" class="fas fa-times text-red-500 text-sm"></i>
                      </div>
                    </div>
                    <button
                      v-if="itemForm.audio_url"
                      type="button"
                      @click="playAudio(itemForm.audio_url)"
                      :class="[
                        'px-3 py-2 rounded-md transition-colors',
                        playingAudioUrl === itemForm.audio_url
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      ]"
                      :title="playingAudioUrl === itemForm.audio_url ? 'Stop audio' : 'Test audio'"
                    >
                      <i :class="playingAudioUrl === itemForm.audio_url ? 'fas fa-stop' : 'fas fa-play'"></i>
                    </button>
                  </div>

                  <!-- Auto-generation buttons -->
                  <div class="flex space-x-2">
                    <button
                      type="button"
                      @click="generateOxfordAudio(itemForm.word)"
                      :disabled="!itemForm.word?.trim()"
                      class="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      title="Generate Oxford Dictionary audio (fallback to TTS if not available)"
                    >
                      <i class="fas fa-book mr-1"></i>Oxford Audio
                    </button>
                    <button
                      type="button"
                      @click="generateTTSAudio(itemForm.word)"
                      :disabled="!itemForm.word?.trim()"
                      class="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      title="Generate Text-to-Speech audio"
                    >
                      <i class="fas fa-microphone mr-1"></i>TTS Audio
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input
                  v-model="itemForm.image_url"
                  type="url"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter image URL">
              </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">Preview</h4>
              <div class="text-sm text-blue-800 space-y-2">
                <p><strong>Word:</strong> {{ itemForm.word || '-' }}</p>
                <p><strong>Translations:</strong>
                  <span v-if="itemForm.uzbek || itemForm.rus">
                    {{ [itemForm.uzbek, itemForm.rus].filter(Boolean).join(', ') }}
                  </span>
                  <span v-else>-</span>
                </p>
                <p><strong>Example:</strong> {{ itemForm.example || '-' }}</p>

                <!-- Audio Preview -->
                <div v-if="itemForm.audio_url" class="flex items-center space-x-2">
                  <strong>Audio:</strong>
                  <button
                    type="button"
                    @click="playAudio(itemForm.audio_url)"
                    :class="[
                      'px-2 py-1 rounded text-xs transition-colors',
                      playingAudioUrl === itemForm.audio_url
                        ? 'bg-red-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    ]"
                  >
                    <i :class="playingAudioUrl === itemForm.audio_url ? 'fas fa-stop' : 'fas fa-play'"></i>
                    {{ playingAudioUrl === itemForm.audio_url ? 'Stop' : 'Play' }}
                  </button>
                  <span :class="[
                    'px-2 py-1 text-xs rounded-full',
                    audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'bg-green-100 text-green-800' :
                    audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  ]">
                    {{ audioValidationStatus[itemForm.audio_url?.trim()] === 'valid' ? 'Valid' :
                       audioValidationStatus[itemForm.audio_url?.trim()] === 'error' ? 'Invalid' :
                       audioValidationStatus[itemForm.audio_url?.trim()] === 'checking' ? 'Checking...' : 'Not checked' }}
                  </span>
                </div>

                <!-- Image Preview -->
                <div v-if="itemForm.image_url" class="flex items-center space-x-2">
                  <strong>Image:</strong>
                  <img
                    :src="itemForm.image_url"
                    :alt="itemForm.word || 'Preview'"
                    class="w-16 h-16 object-cover rounded border-2 border-purple-200 shadow-sm"
                    @load="() => console.log('Preview section image loaded successfully')"
                    @error="(e) => { console.log('Preview section image failed to load:', itemForm.image_url); e.target.style.display = 'none'; }"
                  >
                  <span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">Available</span>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="p-6 border-t border-gray-200 flex justify-end space-x-2">
          <button
            @click="closeModal"
            type="button"
            class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
          <button
            @click="submitVocabularyItem"
            :disabled="submitting"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ submitting ? 'Saving...' : (editingItem ? 'Update Word' : 'Add Word') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Import Modal -->
    <div
      v-if="showBulkModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">Bulk Import Vocabulary</h3>
        </div>
        <div class="p-6">
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
              <div
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                @drop="handleFileDrop"
                @dragover="handleDragOver"
                @dragenter.prevent
              >
                <i class="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-4"></i>
                <p class="text-gray-600 mb-2">Drag and drop your CSV file here, or click to select</p>
                <p v-if="csvFile" class="text-sm text-green-600 mb-2">
                  <i class="fas fa-file-csv mr-1"></i>{{ csvFile.name }}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  class="hidden"
                  ref="csvFileInput"
                  @change="handleFileSelect"
                >
                <button
                  type="button"
                  @click="csvFileInput?.click()"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {{ csvFile ? 'Change File' : 'Select CSV File' }}
                </button>
              </div>
            </div>

            <div class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="font-medium text-yellow-900 mb-2">CSV Format Requirements</h4>
              <div class="text-sm text-yellow-800">
                <p>Your CSV file should have the following columns:</p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li><strong>word</strong> - English word (required)</li>
                  <li><strong>uzbek</strong> - Uzbek translation</li>
                  <li><strong>rus</strong> - Russian translation</li>
                  <li><strong>example</strong> - Example sentence</li>
                  <li><strong>audio_url</strong> - URL to audio file</li>
                  <li><strong>image_url</strong> - URL to image file</li>
                </ul>
                <p class="mt-2">
                  <a
                    href="#"
                    @click.prevent="downloadSampleCSV"
                    class="text-blue-600 hover:text-blue-800">
                    Download sample CSV template
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 flex justify-end space-x-2">
          <button
            @click="closeBulkModal"
            class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
          <button
            @click="importCSV"
            :disabled="!csvFile || loading"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            {{ loading ? 'Importing...' : 'Import CSV' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
