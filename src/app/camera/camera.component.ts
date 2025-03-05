import { Component, inject, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { CameraService } from './services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent implements OnInit {
  cameraService: CameraService = inject(CameraService);
  imgUrl: string = '';
  errorMessage: string = '';
  loading: boolean = false;
  
  // Galería de imágenes
  gallery: string[] = [];
  showGallery: boolean = false;
  
  // Cámara activa
  isFrontCamera: boolean = false;

  ngOnInit() {
    // Cargar la galería al iniciar el componente
    this.loadGallery();
  }
  
  // Cargar la galería
  loadGallery() {
    this.gallery = this.cameraService.loadGalleryFromStorage();
  }

  async takePicture() {
    this.errorMessage = ''; // Limpiar mensajes de error anteriores
    
    try {
      this.loading = true;
      
      // Añadimos un timeout para evitar bloqueos indefinidos
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Por favor, intenta nuevamente.')), 15000);
      });
      
      // Race entre la toma de la foto y el timeout
      this.imgUrl = await Promise.race([
        this.cameraService.takePicture(),
        timeoutPromise
      ]);
      
      if (!this.imgUrl) {
        throw new Error('No se obtuvo una imagen válida');
      }
      
      // Añadir la imagen a la galería
      this.gallery = this.cameraService.addImageToGallery(this.imgUrl);
    } catch (error) {
      console.error('Error al capturar imagen:', error);
      
      // Mensajes de error más amigables
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Ha ocurrido un error desconocido. Por favor, intenta nuevamente.';
      }
      
      this.imgUrl = ''; 
    } finally {
      this.loading = false;
    }
  }

  // Método para reintentar cuando hay un error
  retryCapture() {
    this.errorMessage = '';
    this.takePicture();
  }
  
  // Método para seleccionar una imagen de la galería del dispositivo
  async selectFromGallery() {
    this.errorMessage = '';
    
    try {
      this.loading = true;
      const image = await this.cameraService.selectFromGallery();
      
      if (image) {
        this.imgUrl = image;
        
        // Añadir la imagen a la galería
        this.gallery = this.cameraService.addImageToGallery(image);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen de la galería:', error);
      
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Ha ocurrido un error al acceder a la galería. Por favor, intenta nuevamente.';
      }
    } finally {
      this.loading = false;
    }
  }
  
  // Alternar entre cámara frontal y trasera
  async toggleCamera() {
    try {
      this.loading = true;
      this.isFrontCamera = !this.isFrontCamera;
      
      this.imgUrl = await this.cameraService.switchCamera(this.isFrontCamera);
      
      // Añadir la imagen a la galería
      this.gallery = this.cameraService.addImageToGallery(this.imgUrl);
    } catch (error) {
      console.error('Error al cambiar de cámara:', error);
      
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Ha ocurrido un error al cambiar de cámara. Por favor, intenta nuevamente.';
      }
    } finally {
      this.loading = false;
    }
  }
  
  // Alternar la visualización de la galería
  toggleGallery() {
    this.showGallery = !this.showGallery;
  }
  
  // Seleccionar una imagen de la galería
  selectImage(image: string) {
    this.imgUrl = image;
    this.showGallery = false;
  }
  
  // Eliminar una imagen de la galería
  deleteImage(image: string) {
    // Eliminar la imagen de la galería
    this.gallery = this.cameraService.removeImageFromGallery(image);
    
    // Si la imagen eliminada es la que se muestra actualmente, limpiar la vista
    if (this.imgUrl === image) {
      this.imgUrl = '';
    }
  }
  
  // Limpiar la galería
  clearGallery() {
    if (confirm('¿Estás seguro de que quieres eliminar todas las fotos de la galería?')) {
      this.cameraService.clearGallery();
      this.gallery = [];
      this.imgUrl = '';
    }
  }
  
  // Tomar múltiples fotos
  async takeMultiplePictures() {
    try {
      this.loading = true;
      const images = await this.cameraService.takeMultiplePictures(3);
      
      if (images.length > 0) {
        this.imgUrl = images[0]; // Mostramos la primera foto
        this.loadGallery(); // Actualizamos la galería
      }
    } catch (error) {
      console.error('Error al tomar múltiples fotos:', error);
      
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Ha ocurrido un error al tomar múltiples fotos. Por favor, intenta nuevamente.';
      }
    } finally {
      this.loading = false;
    }
  }
}