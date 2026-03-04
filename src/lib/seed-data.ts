import type { Catalogs } from "./types";

export const seedCatalogs: Catalogs = {
  "ambitos": [
    { "id": "amb-dp", "nombre": "Dignidad del Paciente", "orden": 1 },
    { "id": "amb-gcl", "nombre": "Gestión Clínica", "orden": 2 },
    { "id": "amb-reg", "nombre": "Registros", "orden": 3 }
  ],
  "caracteristicas": [
    { "id": "car-dp-1", "ambitoId": "amb-dp", "nombre": "Trato e información al paciente", "orden": 1 },
    { "id": "car-dp-2", "ambitoId": "amb-dp", "nombre": "Derechos, deberes y confidencialidad", "orden": 2 },

    { "id": "car-gcl-1", "ambitoId": "amb-gcl", "nombre": "Evaluación y reevaluación de pacientes", "orden": 1 },
    { "id": "car-gcl-2", "ambitoId": "amb-gcl", "nombre": "Seguridad del paciente y eventos adversos", "orden": 2 },

    { "id": "car-reg-1", "ambitoId": "amb-reg", "nombre": "Ficha clínica y continuidad del registro", "orden": 1 },
    { "id": "car-reg-2", "ambitoId": "amb-reg", "nombre": "Gestión documental institucional", "orden": 2 }
  ],
  "puntosVerificacion": [
    { "id": "pv-dp-1-1", "caracteristicaId": "car-dp-1", "codigo": "DP.1.1", "nombre": "Información clara y oportuna al paciente", "orden": 1 },
    { "id": "pv-dp-1-2", "caracteristicaId": "car-dp-1", "codigo": "DP.1.2", "nombre": "Respeto y trato digno en la atención", "orden": 2 },

    { "id": "pv-dp-2-1", "caracteristicaId": "car-dp-2", "codigo": "DP.2.1", "nombre": "Resguardo de confidencialidad", "orden": 1 },

    { "id": "pv-gcl-1-1", "caracteristicaId": "car-gcl-1", "codigo": "GCL.1.1", "nombre": "Evaluación inicial documentada", "orden": 1 },
    { "id": "pv-gcl-1-2", "caracteristicaId": "car-gcl-1", "codigo": "GCL.1.2", "nombre": "Reevaluación según evolución clínica", "orden": 2 },

    { "id": "pv-gcl-2-1", "caracteristicaId": "car-gcl-2", "codigo": "GCL.2.1", "nombre": "Notificación y análisis de eventos adversos", "orden": 1 },
    { "id": "pv-gcl-2-2", "caracteristicaId": "car-gcl-2", "codigo": "GCL.2.2", "nombre": "Acciones de mejora y seguimiento", "orden": 2 },

    { "id": "pv-reg-1-1", "caracteristicaId": "car-reg-1", "codigo": "REG.1.1", "nombre": "Ficha clínica completa y trazable", "orden": 1 },
    { "id": "pv-reg-1-2", "caracteristicaId": "car-reg-1", "codigo": "REG.1.2", "nombre": "Acceso y custodia del registro", "orden": 2 },

    { "id": "pv-reg-2-1", "caracteristicaId": "car-reg-2", "codigo": "REG.2.1", "nombre": "Control de versiones y vigencia documental", "orden": 1 },
    { "id": "pv-reg-2-2", "caracteristicaId": "car-reg-2", "codigo": "REG.2.2", "nombre": "Disponibilidad y búsqueda de documentos", "orden": 2 }
  ],
  "elementosMedibles": [
    { "id": "em-dp-1-1-a", "puntoVerificacionId": "pv-dp-1-1", "codigo": "DP.1.1-A", "nombre": "Documento institucional de información al usuario", "orden": 1 },
    { "id": "em-dp-1-1-b", "puntoVerificacionId": "pv-dp-1-1", "codigo": "DP.1.1-B", "nombre": "Registro de entrega de información / consentimiento cuando aplique", "orden": 2 },

    { "id": "em-dp-1-2-a", "puntoVerificacionId": "pv-dp-1-2", "codigo": "DP.1.2-A", "nombre": "Protocolo o instructivo de trato digno", "orden": 1 },

    { "id": "em-dp-2-1-a", "puntoVerificacionId": "pv-dp-2-1", "codigo": "DP.2.1-A", "nombre": "Política/procedimiento de confidencialidad", "orden": 1 },
    { "id": "em-dp-2-1-b", "puntoVerificacionId": "pv-dp-2-1", "codigo": "DP.2.1-B", "nombre": "Evidencia de control de accesos y resguardo", "orden": 2 },

    { "id": "em-gcl-1-1-a", "puntoVerificacionId": "pv-gcl-1-1", "codigo": "GCL.1.1-A", "nombre": "Formato de evaluación inicial (ej: urgencia / policlínico)", "orden": 1 },
    { "id": "em-gcl-1-2-a", "puntoVerificacionId": "pv-gcl-1-2", "codigo": "GCL.1.2-A", "nombre": "Registro de reevaluación y evolución clínica", "orden": 1 },

    { "id": "em-gcl-2-1-a", "puntoVerificacionId": "pv-gcl-2-1", "codigo": "GCL.2.1-A", "nombre": "Procedimiento de notificación de eventos adversos", "orden": 1 },
    { "id": "em-gcl-2-1-b", "puntoVerificacionId": "pv-gcl-2-1", "codigo": "GCL.2.1-B", "nombre": "Formato/registro de análisis (causa raíz u otro)", "orden": 2 },
    { "id": "em-gcl-2-2-a", "puntoVerificacionId": "pv-gcl-2-2", "codigo": "GCL.2.2-A", "nombre": "Plan de mejora y seguimiento con responsables", "orden": 1 },

    { "id": "em-reg-1-1-a", "puntoVerificacionId": "pv-reg-1-1", "codigo": "REG.1.1-A", "nombre": "Norma/procedimiento de registro clínico", "orden": 1 },
    { "id": "em-reg-1-2-a", "puntoVerificacionId": "pv-reg-1-2", "codigo": "REG.1.2-A", "nombre": "Procedimiento de acceso/custodia/archivo", "orden": 1 },

    { "id": "em-reg-2-1-a", "puntoVerificacionId": "pv-reg-2-1", "codigo": "REG.2.1-A", "nombre": "Política de control de versiones (vigencia/obsolescencia)", "orden": 1 },
    { "id": "em-reg-2-2-a", "puntoVerificacionId": "pv-reg-2-2", "codigo": "REG.2.2-A", "nombre": "Evidencia de repositorio con búsqueda y filtros", "orden": 1 }
  ],
  "tiposDocumento": [
    { "id": "td-prot", "nombre": "Protocolo" },
    { "id": "td-instr", "nombre": "Instructivo" },
    { "id": "td-reg", "nombre": "Registro" },
    { "id": "td-acta", "nombre": "Acta" },
    { "id": "td-inf", "nombre": "Informe" },
    { "id": "td-plan", "nombre": "Plan" },
    { "id": "td-ev", "nombre": "Evidencia" },
    { "id": "td-otro", "nombre": "Otro" }
  ],
  "servicios": [
    { "id": "srv-dir", "nombre": "Dirección" },
    { "id": "srv-some", "nombre": "SOME" },
    { "id": "srv-urg", "nombre": "Urgencia" },
    { "id": "srv-med", "nombre": "Medicina" },
    { "id": "srv-ester", "nombre": "Esterilización" },
    { "id": "srv-bod", "nombre": "Bodega/Abastecimiento" },
    { "id": "srv-cal", "nombre": "Calidad y Seguridad del Paciente" }
  ],
  "estadosAcreditacionDoc": [
    { "id": "est-vig", "nombre": "Vigente" },
    { "id": "est-rev", "nombre": "En revisión" },
    { "id": "est-sus", "nombre": "Sustituido" },
    { "id": "est-obs", "nombre": "Obsoleto" }
  ]
};
