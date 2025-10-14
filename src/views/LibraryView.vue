<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";

// State
const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const selectedType = ref("");
const selectedLevel = ref("");
const showModal = ref(false);
const isEditMode = ref(false);
const currentItem = ref(null);
const activeTab = ref("books");

// Data
const books = ref([]);
const movies = ref([]);
const videos = ref([]);

// Modal form data
const form = reactive({
  id: null,
  // Common fields
  title: "",
  thumbnail: "",
  url: "",
  level: "",
  // Book specific
  author: "",
  // Movie specific
  genre: "",
  type: "",
  // Video specific
  source: "",
});

// Constants
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const movieLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const movieGenres = ["action", "comedy", "drama", "horror", "sci-fi"];
const movieTypes = ["movie", "cartoon", "series"];

// API Base URL
const API_BASE_URL = "https://backend.impulselc.uz/api";

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("token");

  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// API functions for each resource type
const booksAPI = {
  getAll: () => apiRequest("/books"),
  getById: (id) => apiRequest(`/books/${id}`),
  create: (data) =>
    apiRequest("/books", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiRequest(`/books/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/books/${id}`, { method: "DELETE" }),
};

const moviesAPI = {
  getAll: () => apiRequest("/movies"),
  getById: (id) => apiRequest(`/movies/${id}`),
  create: (data) =>
    apiRequest("/movies", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiRequest(`/movies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/movies/${id}`, { method: "DELETE" }),
};

const videosAPI = {
  getAll: () => apiRequest("/videos"),
  getById: (id) => apiRequest(`/videos/${id}`),
  create: (data) =>
    apiRequest("/videos", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    apiRequest(`/videos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/videos/${id}`, { method: "DELETE" }),
};

// Computed properties
const currentItems = computed(() => {
  let items = [];
  if (activeTab.value === "books") items = books.value;
  else if (activeTab.value === "movies") items = movies.value;
  else if (activeTab.value === "videos") items = videos.value;

  // Apply filters
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query) ||
        item.genre?.toLowerCase().includes(query) ||
        item.source?.toLowerCase().includes(query)
    );
  }

  if (selectedLevel.value) {
    items = items.filter((item) => item.level === selectedLevel.value);
  }

  return items;
});

const totalStats = computed(() => ({
  books: books.value.length,
  movies: movies.value.length,
  videos: videos.value.length,
  total: books.value.length + movies.value.length + videos.value.length,
}));

// Methods
const fetchBooks = async () => {
  try {
    const response = await booksAPI.getAll();
    books.value = response.data || response || [];
  } catch (err) {
    console.error("Error fetching books:", err);
    books.value = [];
  }
};

const fetchMovies = async () => {
  try {
    const response = await moviesAPI.getAll();
    movies.value = response.data || response || [];
  } catch (err) {
    console.error("Error fetching movies:", err);
    movies.value = [];
  }
};

const fetchVideos = async () => {
  try {
    const response = await videosAPI.getAll();
    videos.value = response.data || response || [];
  } catch (err) {
    console.error("Error fetching videos:", err);
    videos.value = [];
  }
};

const fetchAllData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([fetchBooks(), fetchMovies(), fetchVideos()]);
  } catch (err) {
    error.value = "Failed to load library data";
  } finally {
    isLoading.value = false;
  }
};

const openCreateModal = () => {
  isEditMode.value = false;
  resetForm();
  showModal.value = true;
};

const openEditModal = (item) => {
  isEditMode.value = true;
  currentItem.value = item;

  // Populate form based on item type and active tab
  form.id = item.id;
  form.title = item.title || "";
  form.thumbnail = item.thumbnail || "";
  form.url = item.url || "";
  form.level = item.level || "";

  if (activeTab.value === "books") {
    form.author = item.author || "";
  } else if (activeTab.value === "movies") {
    form.genre = item.genre || "";
    form.type = item.type || "";
  } else if (activeTab.value === "videos") {
    form.source = item.source || "";
  }

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
  currentItem.value = null;
};

const resetForm = () => {
  form.id = null;
  form.title = "";
  form.thumbnail = "";
  form.url = "";
  form.level = "";
  form.author = "";
  form.genre = "";
  form.type = "";
  form.source = "";
};

const saveItem = async () => {
  // Validate based on active tab
  if (activeTab.value === "videos") {
    if (!form.url) {
      error.value = "Please enter a URL";
      return;
    }
  } else {
    if (!form.title) {
      error.value = "Please enter a title";
      return;
    }
  }

  // Validate movie level
  if (
    activeTab.value === "movies" &&
    form.level &&
    !movieLevels.includes(form.level)
  ) {
    error.value =
      "Level must be one of the following values: beginner, intermediate, advanced";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    let api, data, targetArray;

    if (activeTab.value === "books") {
      api = booksAPI;
      targetArray = books;
      data = {
        title: form.title,
        author: form.author,
        thumbnail: form.thumbnail,
        url: form.url,
        level: form.level,
      };
    } else if (activeTab.value === "movies") {
      api = moviesAPI;
      targetArray = movies;
      data = {
        title: form.title,
        genre: form.genre,
        type: form.type,
        thumbnail: form.thumbnail,
        url: form.url,
        level: form.level,
      };
    } else if (activeTab.value === "videos") {
      api = videosAPI;
      targetArray = videos;
      data = {
        url: form.url,
        source: form.source,
        level: form.level,
      };
    }

    if (isEditMode.value) {
      const response = await api.update(form.id, data);
      const updated = response.data || response;
      const index = targetArray.value.findIndex((item) => item.id === form.id);
      if (index !== -1) {
        targetArray.value[index] = { ...targetArray.value[index], ...updated };
      }
    } else {
      const response = await api.create(data);
      const newItem = response.data || response;
      if (newItem && newItem.id) {
        targetArray.value.unshift(newItem);
      }
    }

    closeModal();
  } catch (err) {
    console.error("Error saving item:", err);
    error.value = `Failed to save ${activeTab.value.slice(0, -1)}`;
  } finally {
    isLoading.value = false;
  }
};

const deleteItem = async (item) => {
  if (
    !confirm(`Are you sure you want to delete "${item.title || "this item"}"?`)
  ) {
    return;
  }

  isLoading.value = true;
  try {
    let api, targetArray;

    if (activeTab.value === "books") {
      api = booksAPI;
      targetArray = books;
    } else if (activeTab.value === "movies") {
      api = moviesAPI;
      targetArray = movies;
    } else if (activeTab.value === "videos") {
      api = videosAPI;
      targetArray = videos;
    }

    await api.delete(item.id);
    const index = targetArray.value.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      targetArray.value.splice(index, 1);
    }
  } catch (err) {
    console.error("Error deleting item:", err);
    error.value = `Failed to delete ${activeTab.value.slice(0, -1)}`;
  } finally {
    isLoading.value = false;
  }
};

const getItemIcon = (type) => {
  switch (type) {
    case "books":
      return "fa-book";
    case "movies":
      return "fa-film";
    case "videos":
      return "fa-play";
    default:
      return "fa-file";
  }
};

const getItemColor = (type) => {
  switch (type) {
    case "books":
      return "blue";
    case "movies":
      return "purple";
    case "videos":
      return "red";
    default:
      return "gray";
  }
};

const getLevelColor = (level) => {
  // Movie levels
  if (level === "beginner") return "green";
  if (level === "intermediate") return "yellow";
  if (level === "advanced") return "red";

  // Language levels
  switch (level) {
    case "A1":
    case "A2":
      return "green";
    case "B1":
    case "B2":
      return "yellow";
    case "C1":
    case "C2":
      return "red";
    default:
      return "gray";
  }
};

// Lifecycle
onMounted(() => {
  fetchAllData();
});

// Watchers
watch(activeTab, () => {
  searchQuery.value = "";
  selectedLevel.value = "";
  // Reset form.level when changing tabs
  form.level = "";
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Digital Library</h2>
          <p class="text-gray-600">Manage your educational resources</p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>Add
          {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
    >
      {{ error }}
      <button
        @click="error = ''"
        class="float-right text-red-500 hover:text-red-700"
      >
        ×
      </button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6 text-center">
        <div
          class="p-4 bg-blue-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
        >
          <i class="fas fa-book text-blue-600 text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-800">{{ totalStats.books }}</h3>
        <p class="text-gray-600">Books</p>
      </div>

      <div class="bg-white rounded-lg shadow p-6 text-center">
        <div
          class="p-4 bg-purple-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
        >
          <i class="fas fa-film text-purple-600 text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-800">
          {{ totalStats.movies }}
        </h3>
        <p class="text-gray-600">Movies</p>
      </div>

      <div class="bg-white rounded-lg shadow p-6 text-center">
        <div
          class="p-4 bg-red-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
        >
          <i class="fas fa-play text-red-600 text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-800">
          {{ totalStats.videos }}
        </h3>
        <p class="text-gray-600">Videos</p>
      </div>

      <div class="bg-white rounded-lg shadow p-6 text-center">
        <div
          class="p-4 bg-green-100 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center"
        >
          <i class="fas fa-folder text-green-600 text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-800">{{ totalStats.total }}</h3>
        <p class="text-gray-600">Total Resources</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6">
          <button
            @click="activeTab = 'books'"
            :class="
              activeTab === 'books'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            "
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            <i class="fas fa-book mr-2"></i>
            Books ({{ totalStats.books }})
          </button>
          <button
            @click="activeTab = 'movies'"
            :class="
              activeTab === 'movies'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            "
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            <i class="fas fa-film mr-2"></i>
            Movies ({{ totalStats.movies }})
          </button>
          <button
            @click="activeTab = 'videos'"
            :class="
              activeTab === 'videos'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            "
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            <i class="fas fa-play mr-2"></i>
            Videos ({{ totalStats.videos }})
          </button>
        </nav>
      </div>

      <!-- Filters -->
      <div class="p-6 border-b border-gray-200">
        <div
          class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
        >
          <div class="flex-1">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search library..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            v-model="selectedLevel"
            v-if="activeTab !== 'videos'"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <template v-if="activeTab === 'movies'">
              <option v-for="level in movieLevels" :key="level" :value="level">
                {{ level.charAt(0).toUpperCase() + level.slice(1) }}
              </option>
            </template>
            <template v-else>
              <option v-for="level in levels" :key="level" :value="level">
                {{ level }}
              </option>
            </template>
          </select>
        </div>
      </div>

      <!-- Content -->
      <div class="divide-y divide-gray-200">
        <!-- Loading State -->
        <div
          v-if="isLoading && currentItems.length === 0"
          class="p-6 text-center"
        >
          <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
          <p class="text-gray-500">Loading...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="currentItems.length === 0" class="p-12 text-center">
          <i
            :class="`fas ${getItemIcon(activeTab)}`"
            class="text-gray-400 text-4xl mb-4"
          ></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No {{ activeTab }} found
          </h3>
          <p class="text-gray-500 mb-4">
            {{
              searchQuery
                ? "Try adjusting your search terms"
                : `Add your first ${activeTab.slice(0, -1)} to get started`
            }}
          </p>
          <button
            v-if="!searchQuery"
            @click="openCreateModal"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <i class="fas fa-plus mr-2"></i>Add
            {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
          </button>
        </div>

        <!-- Items List -->
        <div
          v-else
          v-for="item in currentItems"
          :key="item.id"
          class="p-6 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div
                :class="`p-2 bg-${getItemColor(activeTab)}-100 rounded-full`"
              >
                <i
                  :class="`fas ${getItemIcon(activeTab)} text-${getItemColor(activeTab)}-600`"
                ></i>
              </div>
              <div class="ml-4">
                <h3 class="text-lg font-semibold text-gray-800">
                  {{ item.title || item.url }}
                </h3>
                <p class="text-gray-600 text-sm">
                  <span v-if="activeTab === 'books'"
                    >By {{ item.author || "Unknown Author" }}</span
                  >
                  <span v-else-if="activeTab === 'movies'"
                    >{{ item.genre || "Unknown Genre" }} •
                    {{ item.type || "Unknown Type" }}</span
                  >
                  <span v-else-if="activeTab === 'videos'"
                    >Source: {{ item.source || "Unknown" }}</span
                  >
                </p>
                <div
                  class="flex items-center mt-2 text-sm text-gray-500 space-x-4"
                >
                  <span
                    v-if="item.level"
                    :class="`px-2 py-1 bg-${getLevelColor(item.level)}-100 text-${getLevelColor(item.level)}-800 rounded-full`"
                  >
                    {{ item.level }}
                  </span>
                  <span v-if="item.thumbnail" class="text-blue-600">
                    <i class="fas fa-image mr-1"></i>Has Thumbnail
                  </span>
                </div>
              </div>
            </div>
            <div class="flex space-x-2">
              <button
                @click="openEditModal(item)"
                class="text-blue-600 hover:text-blue-700 p-2"
                title="Edit"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                @click="deleteItem(item)"
                class="text-red-600 hover:text-red-700 p-2"
                title="Delete"
              >
                <i class="fas fa-trash"></i>
              </button>
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <i class="fas fa-external-link-alt mr-1"></i>
                {{ activeTab === "videos" ? "Watch" : "Open" }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
      >
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditMode ? "Edit" : "Add New" }}
              {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="saveItem" class="space-y-4">
            <!-- Common Fields -->
            <div v-if="activeTab !== 'videos'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter title"
              />
            </div>

            <!-- Book Specific Fields -->
            <div v-if="activeTab === 'books'">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Author</label
              >
              <input
                type="text"
                v-model="form.author"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter author name"
              />
            </div>

            <!-- Movie Specific Fields -->
            <template v-if="activeTab === 'movies'">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Genre</label
                >
                <select
                  v-model="form.genre"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Genre</option>
                  <option
                    v-for="genre in movieGenres"
                    :key="genre"
                    :value="genre"
                  >
                    {{ genre.charAt(0).toUpperCase() + genre.slice(1) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Type</label
                >
                <select
                  v-model="form.type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option v-for="type in movieTypes" :key="type" :value="type">
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                  </option>
                </select>
              </div>
            </template>

            <!-- Video Specific Fields -->
            <div v-if="activeTab === 'videos'">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Source</label
              >
              <input
                type="text"
                v-model="form.source"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter video source"
              />
            </div>

            <!-- Common Fields Continued -->
            <div v-if="activeTab !== 'videos'">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Thumbnail URL</label
              >
              <input
                type="url"
                v-model="form.thumbnail"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter thumbnail URL"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ activeTab === "videos" ? "YouTube URL" : "URL" }}
                <span class="text-red-500">*</span>
              </label>
              <input
                type="url"
                v-model="form.url"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                :placeholder="
                  activeTab === 'videos'
                    ? 'Enter YouTube URL'
                    : 'Enter resource URL'
                "
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Level</label
              >
              <select
                v-model="form.level"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Level</option>
                <template v-if="activeTab === 'movies'">
                  <option
                    v-for="level in movieLevels"
                    :key="level"
                    :value="level"
                  >
                    {{ level.charAt(0).toUpperCase() + level.slice(1) }}
                  </option>
                </template>
                <template v-else>
                  <option v-for="level in levels" :key="level" :value="level">
                    {{ level }}
                  </option>
                </template>
              </select>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
                {{ isEditMode ? "Update" : "Create" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
