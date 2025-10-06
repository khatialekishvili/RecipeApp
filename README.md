
## Angular Recipe App
A responsive Angular web application that allows users to view, search, add, edit, favorite, and delete recipes.
The project demonstrates clean architecture, Angular best practices, and practical UI implementation.

## What This App Does
- Displays a dynamic list of recipes with a built-in search bar for filtering by title, description, or ingredients.
- Fetches recipes from a mock JSON Server API ([http://localhost:3000/recipes](http://localhost:3000/recipes)) using Angular’s HttpClient.  
  - All recipe data is stored in `db.json` at the project root.  
  - On app load, a `GET` request retrieves all recipes, which are then cached locally in a `BehaviorSubject` for fast access.
- Implements instant, client-side search:  
  - If recipes are already cached, filtering happens immediately without extra network calls.  
  - If not, the service fetches data from the API before applying search filters.
- Displays a detailed page for each recipe, including title, description, ingredients, and image.  
  - Includes a favorite toggle that updates both the backend and the local cache.  
  - Provides edit and delete actions, with confirmation dialogs before deletion.
- Allows users to add new recipes through a form. New entries are marked with `isUser: true` and stored in the mock backend.
- Supports editing existing recipes via a simple `PATCH` request.
- Persists favorite recipes by sending patch updates to the API and synchronizing the local cache.
- Handles deletion in two ways:  
  - User-added recipes are deleted from the backend.  
  - Pre-loaded recipes are filtered out locally (so they remain in `db.json` for future sessions).
- Uses Angular Router for navigation between list, detail, add, and edit pages.
- Uses RxJS and Angular Signals for efficient data flow, reducing unnecessary component reloads.
- Provides clear user feedback through Angular Material dialogs and snackbars.


 ## How to Run the App
1. Install dependencies
npm install
2. Start the mock API
npm run api
3. Start the Angular app
npm start

📝Run both commands in separate terminals. The API must be running for the recipe list to load.

## Technologies & Tools Used
- Angular 17+ (Standalone Components)
- RxJS & `async` pipe for data streams and error handling
- Signals for local state management in the list view
- Angular Material for UI elements (buttons, icons, toggles, dialogs, spinners)
- JSON Server for a quick mock backend
- SCSS for styling and responsive design
