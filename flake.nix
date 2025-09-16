{
  description = "sb-pdf dev shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs = { self, nixpkgs }:
  let
    systems = [ "x86_64-linux" "aarch64-darwin" "x86_64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in f pkgs
    );
  in {
    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = [
          (pkgs.python311.withPackages (ps: with ps; [
            reportlab
            pillow
            # opcionalmente: fonttools # si vas a tocar TTF/OTF
          ]))
          pkgs.nodejs_20   # quítalo si no lo necesitas
        ];

        shellHook = ''
          echo "✅ Dev shell listo. Python: $(python3 --version)"
        '';
      };
    });
  };
}