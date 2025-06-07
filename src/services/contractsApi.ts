
import { Contract, Vehicle, User, Route, Shift } from '@/types';

const API_BASE_URL = 'http://localhost:8000/api'; // Cambiar por tu URL de backend

// Configuración base para las peticiones
const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export const contractsApi = {
  // Obtener todos los contratos
  async getContracts(): Promise<Contract[]> {
    const response = await fetch(`${API_BASE_URL}/contracts/`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching contracts: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Obtener un contrato por ID
  async getContract(id: string): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching contract: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Crear un nuevo contrato
  async createContract(contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/`, {
      method: 'POST',
      ...apiConfig,
      body: JSON.stringify(contractData),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating contract: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Actualizar un contrato
  async updateContract(id: string, contractData: Partial<Contract>): Promise<Contract> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
      method: 'PUT',
      ...apiConfig,
      body: JSON.stringify(contractData),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating contract: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Eliminar un contrato
  async deleteContract(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
      method: 'DELETE',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error deleting contract: ${response.statusText}`);
    }
  },

  // Obtener vehículos disponibles
  async getAvailableVehicles(): Promise<Vehicle[]> {
    const response = await fetch(`${API_BASE_URL}/vehicles/`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching vehicles: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Obtener usuarios disponibles
  async getAvailableUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching users: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Obtener rutas de un contrato
  async getContractRoutes(contractId: string): Promise<Route[]> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/routes`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching contract routes: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Obtener turnos de un contrato
  async getContractShifts(contractId: string): Promise<Shift[]> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/shifts`, {
      method: 'GET',
      ...apiConfig,
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching contract shifts: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Subir documento del contrato
  async uploadContractDocument(contractId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/document`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading document: ${response.statusText}`);
    }

    const result = await response.json();
    return result.document_url;
  },

  // Descargar documento del contrato
  async downloadContractDocument(contractId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/contracts/${contractId}/document`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Error downloading document: ${response.statusText}`);
    }

    return response.blob();
  },
};
