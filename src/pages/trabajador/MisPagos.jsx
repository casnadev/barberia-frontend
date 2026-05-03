import { useEffect,useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

export default function MisPagos(){

 const [pagos,setPagos]=useState([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
   cargarPagos();
 },[]);

 const cargarPagos=async()=>{

   try{

      const res=await authFetch(
        `${API_BASE}/Trabajadores/mis-pagos`
      );

      if(!res) return;

      const data=await res.json();

      setPagos(data);

   }catch(err){
      console.error(err);
   }
   finally{
      setLoading(false);
   }

 };

 const total=
 pagos.reduce(
  (a,p)=>a+p.montoPagado,0
 );

 if(loading)
   return <h3>Cargando pagos...</h3>

 return(
<div>

<h2>Mis Pagos</h2>

<div className="card p-4 mt-3">

<h4>
Total recibido:
S/ {total}
</h4>

<hr/>

<table className="table">
<thead>
<tr>
<th>Fecha</th>
<th>Monto</th>
<th>Observación</th>
</tr>
</thead>

<tbody>

{
pagos.length>0
? pagos.map((p,i)=>(

<tr key={i}>
<td>
{
new Date(
p.fechaPago
).toLocaleString()
}
</td>

<td>
S/ {p.montoPagado}
</td>

<td>
{p.observacion || "-"}
</td>

</tr>

))
:
<tr>
<td
colSpan="3"
className="text-center"
>
No hay pagos registrados
</td>
</tr>
}

</tbody>
</table>

</div>

</div>
 )

}