<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Book, Film, Play, Folder, Edit, Trash2, ExternalLink, Image, X } from 'lucide-vue-next'

// State
const isLoading = ref(false);
const error = ref("");
const searchQuery = ref("");
const selectedType = ref("");
const selectedLevel = ref("all");
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
  level: "all",
  // Book specific
  author: "",
  // Movie specific
  genre: "none",
  type: "none",
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

  if (selectedLevel.value && selectedLevel.value !== 'all') {
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
  form.level = item.level || "all";

  if (activeTab.value === "books") {
    form.author = item.author || "";
  } else if (activeTab.value === "movies") {
    form.genre = item.genre || "none";
    form.type = item.type || "none";
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
  form.level = "all";
  form.author = "";
  form.genre = "none";
  form.type = "none";
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
    form.level !== "all" &&
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
        level: form.level === 'all' ? '' : form.level,
      };
    } else if (activeTab.value === "movies") {
      api = moviesAPI;
      targetArray = movies;
      data = {
        title: form.title,
        genre: form.genre === 'none' ? '' : form.genre,
        type: form.type === 'none' ? '' : form.type,
        thumbnail: form.thumbnail,
        url: form.url,
        level: form.level === 'all' ? '' : form.level,
      };
    } else if (activeTab.value === "videos") {
      api = videosAPI;
      targetArray = videos;
      data = {
        url: form.url,
        source: form.source,
        level: form.level === 'all' ? '' : form.level,
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
  selectedLevel.value = "all";
  // Reset form.level when changing tabs
  form.level = "all";
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold">Digital Library</h2>
          <p class="text-muted-foreground">Manage your educational resources</p>
        </div>
        <Button @click="openCreateModal">
          <Plus class="mr-2 h-4 w-4" />
          Add {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
        </Button>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertDescription class="flex justify-between items-center">
        {{ error }}
        <Button @click="error = ''" variant="ghost" size="icon" class="h-6 w-6">
          <X class="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent class="pt-6 text-center">
          <div class="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Book class="text-blue-600 dark:text-blue-400 h-8 w-8" />
          </div>
          <h3 class="text-2xl font-bold">{{ totalStats.books }}</h3>
          <p class="text-muted-foreground">Books</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 text-center">
          <div class="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Film class="text-purple-600 dark:text-purple-400 h-8 w-8" />
          </div>
          <h3 class="text-2xl font-bold">{{ totalStats.movies }}</h3>
          <p class="text-muted-foreground">Movies</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 text-center">
          <div class="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Play class="text-red-600 dark:text-red-400 h-8 w-8" />
          </div>
          <h3 class="text-2xl font-bold">{{ totalStats.videos }}</h3>
          <p class="text-muted-foreground">Videos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 text-center">
          <div class="p-4 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Folder class="text-green-600 dark:text-green-400 h-8 w-8" />
          </div>
          <h3 class="text-2xl font-bold">{{ totalStats.total }}</h3>
          <p class="text-muted-foreground">Total Resources</p>
        </CardContent>
      </Card>
    </div>

    <!-- Tabs -->
    <Tabs v-model="activeTab" class="space-y-4">
      <Card>
        <CardHeader class="pb-3">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="books">
              <Book class="mr-2 h-4 w-4" />
              Books ({{ totalStats.books }})
            </TabsTrigger>
            <TabsTrigger value="movies">
              <Film class="mr-2 h-4 w-4" />
              Movies ({{ totalStats.movies }})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <Play class="mr-2 h-4 w-4" />
              Videos ({{ totalStats.videos }})
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <!-- Filters -->
        <div class="px-6 pb-4 border-b">
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <Input
                v-model="searchQuery"
                placeholder="Search library..."
                class="w-full"
              />
            </div>
            <div v-if="activeTab !== 'videos'" class="w-full sm:w-48">
              <Select v-model="selectedLevel">
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <template v-if="activeTab === 'movies'">
                    <SelectItem v-for="level in movieLevels" :key="level" :value="level">
                      {{ level.charAt(0).toUpperCase() + level.slice(1) }}
                    </SelectItem>
                  </template>
                  <template v-else>
                    <SelectItem v-for="level in levels" :key="level" :value="level">
                      {{ level }}
                    </SelectItem>
                  </template>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <!-- Content -->
        <CardContent class="p-0">
          <!-- Loading State -->
          <div v-if="isLoading && currentItems.length === 0" class="p-12 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-muted-foreground">Loading...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="currentItems.length === 0" class="p-12 text-center">
            <Book v-if="activeTab === 'books'" class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Film v-else-if="activeTab === 'movies'" class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Play v-else class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-medium mb-2">No {{ activeTab }} found</h3>
            <p class="text-muted-foreground mb-4">
              {{ searchQuery ? "Try adjusting your search terms" : `Add your first ${activeTab.slice(0, -1)} to get started` }}
            </p>
            <Button v-if="!searchQuery" @click="openCreateModal">
              <Plus class="mr-2 h-4 w-4" />
              Add {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
            </Button>
          </div>

          <!-- Items List -->
          <div v-else class="divide-y">
            <div v-for="item in currentItems" :key="item.id" class="p-6 hover:bg-muted/50 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center flex-1 min-w-0">
                  <div class="p-2 rounded-full mr-4" :class="{
                    'bg-blue-100 dark:bg-blue-900/20': activeTab === 'books',
                    'bg-purple-100 dark:bg-purple-900/20': activeTab === 'movies',
                    'bg-red-100 dark:bg-red-900/20': activeTab === 'videos'
                  }">
                    <Book v-if="activeTab === 'books'" class="h-5 w-5" :class="{
                      'text-blue-600 dark:text-blue-400': activeTab === 'books'
                    }" />
                    <Film v-else-if="activeTab === 'movies'" class="h-5 w-5" :class="{
                      'text-purple-600 dark:text-purple-400': activeTab === 'movies'
                    }" />
                    <Play v-else class="h-5 w-5" :class="{
                      'text-red-600 dark:text-red-400': activeTab === 'videos'
                    }" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="text-lg font-semibold truncate">{{ item.title || item.url }}</h3>
                    <p class="text-sm text-muted-foreground">
                      <span v-if="activeTab === 'books'">By {{ item.author || "Unknown Author" }}</span>
                      <span v-else-if="activeTab === 'movies'">{{ item.genre || "Unknown Genre" }} • {{ item.type || "Unknown Type" }}</span>
                      <span v-else-if="activeTab === 'videos'">Source: {{ item.source || "Unknown" }}</span>
                    </p>
                    <div class="flex items-center mt-2 gap-2">
                      <Badge v-if="item.level" :variant="getLevelColor(item.level) === 'green' ? 'default' : getLevelColor(item.level) === 'yellow' ? 'secondary' : 'destructive'">
                        {{ item.level }}
                      </Badge>
                      <span v-if="item.thumbnail" class="text-sm text-primary flex items-center">
                        <Image class="h-4 w-4 mr-1" />Has Thumbnail
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 ml-4">
                  <Button @click="openEditModal(item)" variant="ghost" size="icon" title="Edit">
                    <Edit class="h-4 w-4" />
                  </Button>
                  <Button @click="deleteItem(item)" variant="ghost" size="icon" title="Delete">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                  <Button v-if="item.url" :href="item.url" as="a" target="_blank" size="sm">
                    <ExternalLink class="mr-1 h-4 w-4" />
                    {{ activeTab === "videos" ? "Watch" : "Open" }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Tabs>

    <!-- Modal -->
    <Dialog :open="showModal" @update:open="(val) => { if (!val) closeModal() }">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {{ isEditMode ? "Edit" : "Add New" }} {{ activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1) }}
          </DialogTitle>
          <DialogDescription>
            {{ isEditMode ? "Update the" : "Create a new" }} {{ activeTab.slice(0, -1) }} in your library
          </DialogDescription>
        </DialogHeader>

        <!-- Modal Body -->
        <form @submit.prevent="saveItem" class="space-y-4">
          <!-- Common Fields -->
          <div v-if="activeTab !== 'videos'" class="space-y-2">
            <Label for="title">
              Title <span class="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              v-model="form.title"
              required
              placeholder="Enter title"
            />
          </div>

          <!-- Book Specific Fields -->
          <div v-if="activeTab === 'books'" class="space-y-2">
            <Label for="author">Author</Label>
            <Input
              id="author"
              v-model="form.author"
              placeholder="Enter author name"
            />
          </div>

          <!-- Movie Specific Fields -->
          <template v-if="activeTab === 'movies'">
            <div class="space-y-2">
              <Label for="genre">Genre</Label>
              <Select v-model="form.genre">
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Select Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Genre</SelectItem>
                  <SelectItem v-for="genre in movieGenres" :key="genre" :value="genre">
                    {{ genre.charAt(0).toUpperCase() + genre.slice(1) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="movieType">Type</Label>
              <Select v-model="form.type">
                <SelectTrigger id="movieType">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Type</SelectItem>
                  <SelectItem v-for="type in movieTypes" :key="type" :value="type">
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <!-- Video Specific Fields -->
          <div v-if="activeTab === 'videos'" class="space-y-2">
            <Label for="source">Source</Label>
            <Input
              id="source"
              v-model="form.source"
              placeholder="Enter video source"
            />
          </div>

          <!-- Common Fields Continued -->
          <div v-if="activeTab !== 'videos'" class="space-y-2">
            <Label for="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              type="url"
              v-model="form.thumbnail"
              placeholder="Enter thumbnail URL"
            />
          </div>

          <div class="space-y-2">
            <Label for="url">
              {{ activeTab === "videos" ? "YouTube URL" : "URL" }}
              <span class="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              v-model="form.url"
              required
              :placeholder="activeTab === 'videos' ? 'Enter YouTube URL' : 'Enter resource URL'"
            />
          </div>

          <div class="space-y-2">
            <Label for="level">Level</Label>
            <Select v-model="form.level">
              <SelectTrigger id="level">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select Level</SelectItem>
                <template v-if="activeTab === 'movies'">
                  <SelectItem v-for="level in movieLevels" :key="level" :value="level">
                    {{ level.charAt(0).toUpperCase() + level.slice(1) }}
                  </SelectItem>
                </template>
                <template v-else>
                  <SelectItem v-for="level in levels" :key="level" :value="level">
                    {{ level }}
                  </SelectItem>
                </template>
              </SelectContent>
            </Select>
          </div>

          <!-- Modal Footer -->
          <DialogFooter>
            <Button type="button" @click="closeModal" variant="outline">
              Cancel
            </Button>
            <Button type="submit" :disabled="isLoading">
              <div v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {{ isEditMode ? "Update" : "Create" }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
