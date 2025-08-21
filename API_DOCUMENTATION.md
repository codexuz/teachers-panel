# Server API Documentation

## Expected API Endpoints and Response Formats

### Lessons API

#### GET /api/lessons
Returns all available lessons

**Response:**
```json
[
  {
    "id": 1,
    "title": "Introduction to English Grammar",
    "description": "Basic grammar concepts and rules",
    "content": "Detailed lesson content here...",
    "duration": "45 minutes",
    "level": "Beginner",
    "category": "Grammar",
    "tags": ["grammar", "basics", "english"],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

#### GET /api/lessons/:id
Returns a specific lesson by ID

#### GET /api/lessons?moduleId=:moduleId
Returns lessons assigned to a specific module

#### POST /api/lessons
Creates a new lesson

**Request Body:**
```json
{
  "title": "New Lesson Title",
  "description": "Lesson description",
  "content": "Lesson content",
  "duration": "30 minutes",
  "level": "Intermediate"
}
```

### Courses API

#### GET /api/courses
Returns all courses

#### GET /api/courses/:id
Returns a specific course with its modules

**Response:**
```json
{
  "id": 1,
  "title": "English Language Course",
  "description": "Complete English language learning course",
  "isActive": true,
  "modules": [
    {
      "id": 1,
      "title": "Grammar Basics",
      "description": "Fundamental grammar concepts",
      "courseId": 1,
      "lessons": [
        {
          "id": 1,
          "title": "Introduction to Grammar",
          "description": "Basic grammar introduction",
          "content": "...",
          "moduleId": 1
        }
      ],
      "quizzes": []
    }
  ]
}
```

### Modules API

#### GET /api/modules?courseId=:courseId
Returns modules for a specific course

#### POST /api/modules
Creates a new module

**Request Body:**
```json
{
  "title": "Module Title",
  "description": "Module description",
  "courseId": 1
}
```

### Quizzes API

#### GET /api/quizzes?moduleId=:moduleId
Returns quizzes for a specific module

#### POST /api/quizzes
Creates a new quiz

**Request Body:**
```json
{
  "title": "Quiz Title",
  "description": "Quiz description",
  "moduleId": 1,
  "questions": [],
  "passingScore": 70,
  "timeLimit": 30,
  "attempts": 3
}
```

## Error Responses

All endpoints should return appropriate HTTP status codes and error messages:

```json
{
  "error": "Resource not found",
  "message": "The requested lesson was not found",
  "status": 404
}
```

## Authentication

If your API requires authentication, include the Authorization header:

```
Authorization: Bearer <your-token>
```

You can modify the `apiRequest` function in `src/utils/api.js` to include authentication tokens.
