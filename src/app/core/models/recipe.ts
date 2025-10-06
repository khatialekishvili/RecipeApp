export interface Recipe {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
  thumbnailUrl: string;
  favorite: boolean;
  isUser?: boolean; 
}
