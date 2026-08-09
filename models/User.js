const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    // revoca delle sessioni. Ogni token porta questo numero nel claim `tv`;
    // il logout lo incrementa, così tutti i token emessi prima smettono di
    // valere all'istante. Senza, "Esci" cancellava solo il cookie e una
    // copia del token (es. quella in localStorage del frontend) restava
    // buona fino alla scadenza naturale.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UserSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
    delete returnedObject.tokenVersion;
  },
});

module.exports = mongoose.model("User", UserSchema);
