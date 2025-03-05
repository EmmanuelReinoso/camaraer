import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  // Clave para almacenar la galería en localStorage
  private readonly GALLERY_STORAGE_KEY = 'app_photo_gallery';

  constructor() {
    // No necesitamos detectar la plataforma ya que asumimos que es móvil
  }

  private async checkPermissions(): Promise<void> {
    try {
      const permissions = await Camera.checkPermissions();
      
      // Solicitamos permisos si no están otorgados
      if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
        await Camera.requestPermissions();
      }
    } catch (error) {
      console.warn('Error al verificar permisos:', error);
      // Registramos el error pero continuamos para que falle en el momento oportuno si es necesario
    }
  }

  async takePicture(): Promise<string> {
    // Verificamos permisos antes de intentar usar la cámara
    await this.checkPermissions();

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1280,
        height: 720,
        correctOrientation: true
      });
      
      // Procesamos la respuesta para obtener una URL utilizable
      if (image.webPath) {
        return image.webPath;
      } else if (image.path) {
        // En Android a veces el webPath no está disponible pero sí el path
        return Capacitor.convertFileSrc(image.path);
      } else {
        throw new Error("No se pudo obtener la ruta de la imagen");
      }
    } catch (error: any) {
      console.error('Error al tomar la foto:', error);
      
      // Mensajes de error específicos para problemas comunes en móvil
      if (error.message && error.message.includes('permission')) {
        throw new Error('Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu dispositivo.');
      } else if (error.message && error.message.includes('cancelled')) {
        throw new Error('La captura de imagen fue cancelada por el usuario.');
      } else if (error.message && error.message.includes('timeout')) {
        throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
      } else {
        throw new Error(error.message || 'Error al usar la cámara del dispositivo');
      }
    }
  }

  // Método para seleccionar una imagen de la galería
  async selectFromGallery(): Promise<string> {
    await this.checkPermissions();

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: 1280,
        height: 720,
        correctOrientation: true
      });
      
      if (image.webPath) {
        return image.webPath;
      } else if (image.path) {
        return Capacitor.convertFileSrc(image.path);
      } else {
        throw new Error("No se pudo obtener la ruta de la imagen");
      }
    } catch (error: any) {
      console.error('Error al seleccionar la imagen:', error);
      
      if (error.message && error.message.includes('permission')) {
        throw new Error('Permisos de galería denegados. Por favor, permite el acceso a las fotos en la configuración de tu dispositivo.');
      } else if (error.message && error.message.includes('cancelled')) {
        throw new Error('La selección de imagen fue cancelada por el usuario.');
      } else {
        throw new Error(error.message || 'Error al acceder a la galería del dispositivo');
      }
    }
  }

  // Método para guardar una imagen base64 en el almacenamiento nativo
  async saveImage(dataUrl: string, fileName: string): Promise<string> {
    try {
      // Usamos la API del navegador para crear un blob y guardarlo
      // Esta es una alternativa cuando no tenemos @capacitor/filesystem
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      
      // Creamos un enlace para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Simulamos un clic para iniciar la descarga
      link.click();
      
      // Limpiamos
      URL.revokeObjectURL(url);
      
      return dataUrl; // Devolvemos la URL original ya que no podemos obtener la ruta del sistema de archivos
    } catch (error) {
      console.error('Error al guardar la imagen:', error);
      throw new Error('No se pudo guardar la imagen en el dispositivo');
    }
  }

  // Métodos para la galería interna
  
  // Guardar la galería en localStorage
  saveGalleryToStorage(images: string[]): void {
    try {
      localStorage.setItem(this.GALLERY_STORAGE_KEY, JSON.stringify(images));
    } catch (error) {
      console.error('Error al guardar la galería en localStorage:', error);
    }
  }
  
  // Cargar la galería desde localStorage
  loadGalleryFromStorage(): string[] {
    try {
      const gallery = localStorage.getItem(this.GALLERY_STORAGE_KEY);
      return gallery ? JSON.parse(gallery) : [];
    } catch (error) {
      console.error('Error al cargar la galería desde localStorage:', error);
      return [];
    }
  }
  
  // Añadir una imagen a la galería
  addImageToGallery(imageUrl: string): string[] {
    const gallery = this.loadGalleryFromStorage();
    
    // Evitamos duplicados
    if (!gallery.includes(imageUrl)) {
      gallery.unshift(imageUrl); // Añadimos al principio para que sea la más reciente
      this.saveGalleryToStorage(gallery);
    }
    
    return gallery;
  }
  
  // Eliminar una imagen de la galería
  removeImageFromGallery(imageUrl: string): string[] {
    const gallery = this.loadGalleryFromStorage();
    const index = gallery.indexOf(imageUrl);
    
    if (index !== -1) {
      gallery.splice(index, 1);
      this.saveGalleryToStorage(gallery);
    }
    
    return gallery;
  }
  
  // Borrar toda la galería
  clearGallery(): void {
    localStorage.removeItem(this.GALLERY_STORAGE_KEY);
  }

  // Método para capturar múltiples fotos
  async takeMultiplePictures(count: number = 3): Promise<string[]> {
    const images: string[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const imagePath = await this.takePicture();
        images.push(imagePath);
        
        // Añadimos automáticamente a la galería
        this.addImageToGallery(imagePath);
      } catch (error) {
        console.error(`Error al tomar la foto ${i+1}:`, error);
        // Continuamos con las siguientes fotos incluso si una falla
      }
    }
    
    return images;
  }

  // Método para cambiar entre cámara frontal y trasera
  async switchCamera(front: boolean = true): Promise<string> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        direction: front ? CameraDirection.Front : CameraDirection.Rear,
        width: 1280,
        height: 720,
        correctOrientation: true
      });
      
      if (image.webPath) {
        return image.webPath;
      } else if (image.path) {
        return Capacitor.convertFileSrc(image.path);
      } else {
        throw new Error("No se pudo obtener la ruta de la imagen");
      }
    } catch (error: any) {
      console.error('Error al cambiar de cámara:', error);
      throw new Error(error.message || 'Error al cambiar entre cámaras del dispositivo');
    }
  }
}