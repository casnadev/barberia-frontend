import LottieModule from "lottie-react";
import animationData from "../../assets/logo.json";

const Lottie = LottieModule?.default ?? LottieModule;

function LogoAnimado({ width = 100, height = 100 }) {
  if (!Lottie) {
    return (
      <div
        style={{
          width: width,
          height: height,
          borderRadius: 8,
          background: "#d4af37",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: width,
        height: height,
        overflow: "hidden",
      }}
    >
      <Lottie
        animationData={animationData}
        loop
        autoplay
        style={{
          width: "100%",
          height: "100%",
          transform: "scale(1.6)",
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

export default LogoAnimado;