import Lottie from "lottie-react";
import animationData from "../../assets/logo.json";

function LogoAnimado() {
  return (
    <div style={{ width: 32, height: 32 }}>
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
      />
    </div>
  );
}

export default LogoAnimado;