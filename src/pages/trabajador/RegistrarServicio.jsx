import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

export default function RegistrarServicio() {

 const [servicios,setServicios]=useState([]);
 const [idServicio,setIdServicio]=useState("");
 const [cantidad,setCantidad]=useState(1);
 const [precio,setPrecio]=useState("");
 const [mensaje,setMensaje]=useState("");
 const [loading,setLoading]=useState(false);

 useEffect(()=>{
   cargarServicios();
 },[]);

 const cargarServicios = async()=>{

   const res=await authFetch(
      `${API_BASE}/Servicios`
   );

   if(!res) return;

   const data=await res.json();

   setServicios(data);
 };

 const seleccionarServicio=(id)=>{

   setIdServicio(id);

   const s=servicios.find(
      x=>x.idServicio===parseInt(id)
   );

   if(s){
      setPrecio(s.precioBase);
   }
 };

 const guardarServicio=async(e)=>{
   e.preventDefault();

   setLoading(true);
   setMensaje("");

   try{

      const res=await authFetch(
        `${API_BASE}/Trabajadores/registrar-servicio`,
        {
         method:"POST",
         headers:{
           "Content-Type":"application/json"
         },
         body:JSON.stringify({
           detalles:[
             {
               idServicio:parseInt(idServicio),
               idTrabajador:0,
               cantidad:parseInt(cantidad),
               precioUnitario:parseFloat(precio)
             }
           ]
         })
        }
      );

      const data=await res.json();

      if(!res.ok){
         setMensaje(data.mensaje);
         return;
      }

      setMensaje("Servicio registrado correctamente");

      setCantidad(1);
      setIdServicio("");
      setPrecio("");

   }
   catch{
      setMensaje("Error al registrar");
   }
   finally{
      setLoading(false);
   }

 };

 return(

<div className="container mt-4">

<h2>Registrar Servicio</h2>

<form
 onSubmit={guardarServicio}
 className="card p-4 mt-3"
>

<div className="mb-3">
<label>Servicio</label>

<select
className="form-control"
value={idServicio}
onChange={(e)=>seleccionarServicio(e.target.value)}
required
>

<option value="">
Seleccione
</option>

{
servicios.map(s=>(
<option
key={s.idServicio}
value={s.idServicio}
>
{s.nombre} - S/ {s.precioBase}
</option>
))
}

</select>
</div>


<div className="mb-3">
<label>Cantidad</label>

<input
type="number"
className="form-control"
value={cantidad}
onChange={(e)=>setCantidad(e.target.value)}
/>
</div>


<div className="mb-3">
<label>Precio</label>

<input
type="number"
className="form-control"
value={precio}
onChange={(e)=>setPrecio(e.target.value)}
/>
</div>


<button
className="btn btn-dark"
disabled={loading}
>
{
loading
?"Guardando..."
:"Registrar"
}
</button>

{
mensaje &&
<div className="alert alert-info mt-3">
 {mensaje}
</div>
}

</form>

</div>

 )
}