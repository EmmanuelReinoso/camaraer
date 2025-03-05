import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { CameraService } from './services/camera.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [NgIf],
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent {
  cameraService: CameraService = inject(CameraService);
  imgUrl: string = '';
  errorMessage: string = '';
  loading: boolean = false;

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
}