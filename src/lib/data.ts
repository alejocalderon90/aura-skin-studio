import { Treatment, Client, Appointment, Payment, Config } from './types';

export const initialTreatments: Treatment[] = [
  { id: '1', name: 'Limpieza facial profunda', duration: '60 min', price: 12500, category: 'Facial', status: 'Activo', description: 'Renovación celular, extracción de impurezas e hidratación intensiva.' },
  { id: '2', name: 'Peeling químico', duration: '45 min', price: 18000, category: 'Facial', status: 'Activo', description: 'Tratamiento despigmentante para unificar el tono y aportar luminosidad.' },
  { id: '3', name: 'Dermaplaning', duration: '40 min', price: 15000, category: 'Facial', status: 'Activo', description: 'Exfoliación física que remueve células muertas y vello facial fino.' },
  { id: '4', name: 'Radiofrecuencia facial', duration: '50 min', price: 22000, category: 'Facial', status: 'Activo', description: 'Estimula la producción de colágeno y elastina, efecto lifting.' },
  { id: '5', name: 'Mesoterapia', duration: '55 min', price: 24000, category: 'Dermatológico', status: 'Activo', description: 'Microinyecciones de vitaminas y ácido hialurónico para hidratar.' },
  { id: '6', name: 'Tratamiento antiacné', duration: '50 min', price: 16000, category: 'Dermatológico', status: 'Activo', description: 'Protocolo específico para pieles con tendencia acneica y comedones.' },
];

export const initialAppointments: Appointment[] = [
  { id: '1', clientId: 'c1', clientName: 'Martina López', treatmentId: '1', treatmentName: 'Limpieza facial profunda', date: new Date().toISOString().split('T')[0], time: '17:30', professional: 'Dra. Silva', status: 'Confirmado' },
  { id: '2', clientId: 'c2', clientName: 'Camila Fernández', treatmentId: '2', treatmentName: 'Peeling químico', date: new Date().toISOString().split('T')[0], time: '18:15', professional: 'Dra. Silva', status: 'Pendiente' },
  { id: '3', clientId: 'c3', clientName: 'Sofía Ruiz', treatmentId: '4', treatmentName: 'Radiofrecuencia facial', date: '2025-05-15', time: '10:00', professional: 'Lic. Gómez', status: 'Confirmado' },
  { id: '4', clientId: 'c4', clientName: 'Valentina Gómez', treatmentId: '3', treatmentName: 'Dermaplaning', date: '2025-05-15', time: '11:30', professional: 'Lic. Gómez', status: 'Finalizado' },
  { id: '5', clientId: 'c5', clientName: 'Julieta Acosta', treatmentId: '5', treatmentName: 'Mesoterapia', date: '2025-05-16', time: '14:00', professional: 'Dra. Silva', status: 'Cancelado' },
  { id: '6', clientId: 'c6', clientName: 'Florencia Medina', treatmentId: '1', treatmentName: 'Limpieza facial profunda', date: '2025-05-16', time: '15:30', professional: 'Dra. Silva', status: 'Confirmado' },
  { id: '7', clientId: 'c7', clientName: 'Lucía Torres', treatmentId: '6', treatmentName: 'Tratamiento antiacné', date: '2025-05-17', time: '09:00', professional: 'Lic. Gómez', status: 'Pendiente' },
  { id: '8', clientId: 'c8', clientName: 'Carolina Herrera', treatmentId: '4', treatmentName: 'Radiofrecuencia facial', date: '2025-05-17', time: '11:00', professional: 'Lic. Gómez', status: 'Confirmado' },
];

export const initialClients: Client[] = [
  { id: 'c1', name: 'Martina López', email: 'martina@example.com', phone: '+54 11 1234-5678', lastTreatment: 'Limpieza facial profunda', visits: 4, status: 'Activo' },
  { id: 'c2', name: 'Camila Fernández', email: 'camila@example.com', phone: '+54 11 2345-6789', lastTreatment: 'Peeling químico', visits: 1, status: 'Nuevo' },
  { id: 'c3', name: 'Sofía Ruiz', email: 'sofia@example.com', phone: '+54 11 3456-7890', lastTreatment: 'Dermaplaning', visits: 12, status: 'Activo' },
  { id: 'c4', name: 'Valentina Gómez', email: 'valentina@example.com', phone: '+54 11 4567-8901', lastTreatment: 'Radiofrecuencia', visits: 0, status: 'Inactivo' },
];

export const initialPayments: Payment[] = [
  { id: 'p1', clientName: 'Martina López', concept: 'Limpieza facial profunda', amount: 12500, method: 'Transferencia', status: 'Pagado', date: '2025-05-10' },
  { id: 'p2', clientName: 'Camila Fernández', concept: 'Peeling químico', amount: 18000, method: 'Efectivo', status: 'Señado', date: '2025-05-12' },
  { id: 'p3', clientName: 'Sofía Ruiz', concept: 'Mesoterapia', amount: 24000, method: 'Mercado Pago', status: 'Pendiente', date: '2025-05-14' },
  { id: 'p4', clientName: 'Lucía Torres', concept: 'Dermaplaning', amount: 15000, method: 'Tarjeta de Crédito', status: 'Pagado', date: '2025-05-14' },
];

export const initialConfig: Config = {
  name: 'Aura Skin Studio',
  phone: '+54 11 4444-5555',
  email: 'contacto@auraskinstudio.com',
  address: 'Av. Libertador 1234, CABA',
  hours: 'Lunes a Viernes 09:00 - 19:00, Sábados 09:00 - 14:00',
  autoMessage: 'Hola, tu turno en Aura Skin Studio ha sido confirmado. Te esperamos.',
};
