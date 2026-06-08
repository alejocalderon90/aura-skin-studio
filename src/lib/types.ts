export type Treatment = {
  id: string;
  name: string;
  duration: string;
  price: number;
  category: 'Facial' | 'Corporal' | 'Dermatológico';
  status: 'Activo' | 'Inactivo';
  description: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastTreatment: string;
  visits: number;
  status: 'Activo' | 'Nuevo' | 'Inactivo';
  observations?: string;
};

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  treatmentId: string;
  treatmentName: string;
  date: string;
  time: string;
  professional: string;
  status: 'Disponible' | 'Confirmado' | 'Pendiente' | 'Cancelado' | 'Finalizado';
  comments?: string;
};

export type Payment = {
  id: string;
  clientName: string;
  concept: string;
  amount: number;
  method: string;
  status: 'Pagado' | 'Pendiente' | 'Señado';
  date: string;
};

export type Config = {
  name: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  autoMessage: string;
};
